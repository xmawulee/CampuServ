# CampusServ — Architecture & Security Model (Pass 1 of 5)

This document provides an exhaustive overview of the CampusServ microservice architecture, API routing, inter-service communication, environment configuration, and authentication flows, reflecting the current state of the code.

## 1. System Architecture Map

CampusServ is built as an 8-service Spring Boot microservice architecture, utilizing Spring Cloud Gateway for routing and Spring Cloud Netflix Eureka for service discovery.

### Microservices Inventory

| Service Name | Local Port | Core Responsibility |
|---|---|---|
| **api-gateway** | `8080` | Entry point for all clients. Handles CORS, global JWT validation, and path-based routing. |
| **eureka-server** | `8761` | Service registry. All other services register here to enable load-balanced, dynamic routing via service names. |
| **auth-service** | `8087` | Authentication, student email verification, JWT issuance, and login flows. |
| **user-service** | `8083` | Manages user profiles (Client & Provider), provider applications, verifications, and portfolios. |
| **request-service** | `8082` | Manages service requests (postings), service categories, and provider bids/offers. |
| **job-service** | `8084` | Manages the actual jobs (accepted requests), status progression (pending → active → completed), and scheduled jobs. |
| **payment-service** | `8085` | Handles Paystack integrations, escrow accounts, wallet balances, withdrawals, and receipts. |
| **supporting-service**| `8086` | Real-time chat (STOMP/WebSocket), reviews, disputes, push notifications, and live location tracking. |

### Inter-Service Communication
The system does **not** use OpenFeign. Instead, services communicate internally via two methods:
1. **Synchronous REST Calls**: Handled via Spring `@LoadBalanced RestTemplate`. Services address each other using Eureka registry names (e.g., `http://user-service/api/users/validate`).
2. **Asynchronous Events**: Handled via **RabbitMQ** (Port `5672`). Used for cross-service events to avoid tight coupling (e.g., `job-service` broadcasts job status updates; `supporting-service` listens via `JobStatusListener` to trigger push notifications).

### Gateway Routing Table
The `api-gateway` strips internal prefixes and maps external paths to internal services as follows:

| External Path | Routes To | Internal Processing |
|---|---|---|
| `/auth/**`, `/admin/providers/**`, `/admin/verification/**`, `/admin/users/**` | `auth-service` | Handled natively. |
| `/users/**`, `/providers/**` | `user-service` | Handled natively. |
| `/api/users/**` | `user-service` | Prefixes stripped (mapped to internal endpoints). |
| `/requests/**`, `/categories/**` | `request-service` | Handled natively. |
| `/api/requests/**` | `request-service` | Prefixes stripped. |
| `/jobs/**`, `/admin/jobs/**` | `job-service` | Handled natively. |
| `/payments/**`, `/admin/finance/**`, `/wallet/**` | `payment-service` | Handled natively. |
| `/api/v1/payments/**`, `/api/v1/wallet/**` | `payment-service` | Prefix stripped (`StripPrefix=2`). |
| `/chats/**`, `/reviews/**`, `/disputes/**`, `/notifications/**`, `/location/**` | `supporting-service`| Handled natively. |

---

## 2. Environment Configuration

### Backend Environment Variables (`application.yml` & `.env` configurations)
The backend services derive their configuration from their respective `application.yml` files, utilizing the following environment variables (with hardcoded fallbacks):

| Variable | Used In | Purpose / Fallback |
|---|---|---|
| `JWT_SECRET` | `auth-service`, `api-gateway` | The 256-bit+ HMAC signing key for JSON Web Tokens. Fallback is hardcoded in `application.yml`. |
| `POSTGRES_PASSWORD` | All DB-backed services | Password for the `postgres` user on `localhost:5433`. Fallback: `postgres`. |
| `RABBITMQ_PASSWORD` | `job-service`, `supporting-service` | Credentials for the AMQP message broker. |
| `REDIS_HOST` / `REDIS_PORT`| `supporting-service` | Redis connection for STOMP/WebSocket caching or message brokering. Fallback: `6379`. |
| `PAYSTACK_SECRET_KEY` | `payment-service` | The private key used for initializing transactions. |
| `PAYSTACK_WEBHOOK_SECRET`| `payment-service` | Used to verify the integrity of incoming Paystack webhook payloads. |
| `GOOGLE_API_KEY` | `supporting-service` | (If utilized for backend reverse geocoding/distance matrix). |
| `eureka.instance.hostname` | `eureka-server` | Instance hostname for deployment environments. |

### Mobile Environment Variables (`mobile/.env`)
| Variable | Purpose | Value in current state |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Powers `locationService.reverseGeocode` & `placesAutocomplete`. | *Active Key Set* |
| `API_BASE_URL` | Base URL for Axios interceptor targeting the `api-gateway`. | `https://blank-aide-tile.ngrok-free.dev` |
| `PAYSTACK_PUBLIC_KEY` | Used to initialize client-side Paystack modals. | `pk_test_YOUR_...` |
| `APP_ENV` | Toggles dev-only logging and mock states. | `development` |
| `WS_BASE_URL` | Endpoint for the STOMP chat connection to `supporting-service`. | `wss://blank-aide-tile.ngrok-free.dev/chats/ws/connect` |

---

## 3. Auth & Security Model

### The Authentication Flow
1. **Student Registration**: 
   - Uses KNUST student emails. 
   - *Status*: The system is built to issue JWTs upon login (`/auth/login`).
2. **JWT Issuance**:
   - `auth-service` validates credentials against its Postgres DB.
   - It generates a JWT using `Jwts.builder()` signed with `HS256` using the shared `JWT_SECRET`.
   - The token payload (Claims) includes the `sub` (User ID) and `role` (`CLIENT`, `PROVIDER`, or `ADMIN`).
3. **Gateway Protection (`JwtValidationFilter`)**:
   - Every request hitting `api-gateway` passes through the `JwtValidationFilter` **unless** it matches the public endpoints whitelist.
   - **Public Endpoints**: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/files/`, and `/payments/webhook`.
   - For all other endpoints, the gateway intercepts the `Authorization: Bearer <token>` header, parses it using the `JWT_SECRET`, and validates the signature.
   - **Request Mutation**: If valid, the gateway mutates the downstream request to attach `X-User-Id` and `X-User-Role` headers. This prevents internal microservices from having to parse JWTs; they simply read the headers.
4. **Role Enforcement**:
   - Inside `JwtValidationFilter`, any request path starting with `/admin/` explicitly checks if `role == "ADMIN"`. If not, it rejects the request with a `403 FORBIDDEN` before it ever reaches the underlying service.
   - Internal microservices pull `X-User-Role` to enforce finer-grained business logic (e.g., preventing a `CLIENT` from accepting a bid).

### Security Architecture Gaps
- **Missing Refresh Token Logic**: While the gateway lists `/auth/refresh` as public, an initial code scan suggests refresh token storage/rotation might be partially stubbed or relies entirely on short-lived JWTs. (To be fully verified in Pass 2).


# CampusServ — Backend Core Services & Data Architecture (Pass 2 of 5)

This document maps out the core data domains of the CampusServ backend: User Management, Authentication, and Supporting Services (Chats, Reviews, Disputes, Location). It covers the specific database schema, entity structures, and the REST API endpoints currently implemented in the code.

## 1. Auth Service (`auth-service`)

The `auth-service` is responsible for registering students, storing hashed passwords, issuing JWTs, and surprisingly, initializing user wallets.

### Data Schema (PostgreSQL)
Migrations are driven by Hibernate (`ddl-auto: update`). There is no Flyway migration script directory initialized for this service.

**`users` Table (Auth context)**
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | UUID generated natively. |
| `email` | VARCHAR | Unique, Not Null | The KNUST student email. |
| `password_hash` | VARCHAR | Not Null | BCrypt hashed password. |
| `full_name` | VARCHAR | Not Null | User's full name. |
| `role` | VARCHAR | Not Null | `STUDENT`, `PROVIDER`, or `ADMIN`. |
| `is_verified` | BOOLEAN | Default `false` | Email verification flag. |
| `verification_status` | VARCHAR | Default `PENDING_REVIEW`| Provider/Student ID review status (`PENDING_REVIEW`, `APPROVED`, `REJECTED`). |
| `student_id_photo_url` | VARCHAR | Nullable | S3/CDN link to ID proof. |
| `account_status` | VARCHAR | Default `ACTIVE` | `ACTIVE`, `SUSPENDED`, or `BANNED`. |

**`wallets` Table (Auth context)**
*Note: The wallet is created here during user registration to ensure synchronous setup, though ledger logic lives in `payment-service`.*
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | Wallet UUID. |
| `user_id` | VARCHAR | Unique, Not Null | Link to `users.id`. |
| `balance` | DECIMAL | Default `0.00` | Available balance. |
| `pending_escrow` | DECIMAL | Default `0.00` | Funds locked in active jobs. |

### REST Endpoints
**Public Routes (`/auth/**`)**
- `POST /auth/register`: Creates a `User` and initializes a `Wallet`.
- `POST /auth/login`: Validates credentials, issues JWT.
- `POST /auth/refresh`: Refreshes JWT (implementation appears stubbed/basic).
- `POST /auth/upload-id`: Handles multipart upload for student ID verification.
- `POST /auth/logout`: Invalidates active session token.

**Admin Routes (`/admin/**` protected by Gateway)**
- `GET /admin/counts`: Dashboard aggregate metrics.
- `GET /admin/verification/queue`, `/admin/providers/pending`: Lists pending approvals.
- `POST /admin/verification/{userId}/approve`, `/admin/providers/{userId}/approve`: Approves verification.
- `POST /admin/verification/{userId}/reject`, `/admin/providers/{userId}/reject`: Rejects with reason.
- `GET /admin/users`: Lists all users.
- `PUT /admin/users/{userId}/status`: Suspends/Bans users.

---

## 2. User Service (`user-service`)

The `user-service` handles the profile management, portfolios, and service categories. It does not handle passwords. 

### Data Schema
**`users` Table (Profile context)**
*(Shares the `users` table via independent JPA entity mapping without password columns)*.

**`provider_profiles` Table**
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | 1:1 match with `users.id`. |
| `bio` | TEXT | Nullable | Provider's description. |
| `rating` | DECIMAL(3,2) | Default `0.00` | Aggregate rating. |
| `completed_jobs_count` | INTEGER | Default `0` | Auto-incremented upon job completion. |
| `portfolio_urls` | TEXT | Nullable | Comma-separated or JSON list of image URLs. |
| `approval_status` | VARCHAR | Default `PENDING` | `PENDING`, `APPROVED`, `REJECTED`. |
| `is_test_account` | BOOLEAN | Default `false` | Used for staging bypasses. |

**`service_categories` Table**
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | Category UUID. |
| `name` | VARCHAR | Unique, Not Null | e.g., "Laundry", "Tutoring". |
| `description` | VARCHAR | Nullable | Category details. |

**`provider_services` Table**
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR | Primary Key | Mapping UUID. |
| `provider_id` | VARCHAR | Not Null | Link to `users.id`. |
| `category_id` | VARCHAR | FK (EAGER) | Link to `service_categories.id`. |
| `base_price` | DECIMAL | Not Null | The provider's starting rate. |

### REST Endpoints
- `GET /users/{id}`: Fetch public user profile.
- `PUT /users/{id}/profile`: Update name, bio, etc.
- `POST /users/{id}/profile-picture`: Multipart upload.
- `DELETE /users/{id}/avatar`: Remove picture.
- `GET /providers`: Fetch list of approved providers (with filtering).
- `POST /providers/{id}/services`: Add a category and base price to provider.
- `POST /providers/{id}/portfolio`: Upload portfolio images.
- `DELETE /providers/{id}/portfolio`: Remove portfolio images.

---

## 3. Supporting Service (`supporting-service`)

Handles auxiliary but critical domains: Chats, Reviews, Disputes, and Google Maps Location integration.

### Data Schema
- **`chat_messages`**: `id`, `thread_id`, `sender_id`, `type` (`TEXT`), `content`, `status` (`SENT`), `client_temp_id` (for optimistic UI reconciliation), `read_at`.
- **`reviews`**: `id`, `job_id`, `reviewer_id`, `reviewee_id`, `rating` (Integer), `comment`.
- **`disputes`**: `id`, `job_id`, `raised_by_id`, `description`, `status` (`RAISED`, `EVIDENCE`, `UNDER_REVIEW`, `RESOLVED`), `resolution`.
- **`notifications`**: `id`, `user_id`, `title`, `body`, `type`, `read` (Boolean).

### REST Endpoints
**Chats (`/chats`)**
- `GET /chats/thread/request/{requestId}`: Get or create thread for a job/request. *(Note: Fetches user details syncly from `user-service` via RestTemplate)*.
- `GET /chats/history/{threadId}`: Fetch message history.
- `POST /chats/{threadId}/voice-note`: Placeholder for media messages.

**Location (`/location`)**
- `POST /location/task/{taskId}/arrive`: Marks provider as arrived (triggers geo-fence check).
- `GET /location/reverse-geocode`: Proxies to Google Maps Geocoding API using `GOOGLE_API_KEY`.
- `GET /location/places-autocomplete`: Proxies to Google Places API.
- `GET /location/place-details`, `/location/directions`, `/location/distance-matrix`: Proxies to Google Maps APIs.
- `GET /location/static-map`: Generates and returns a `IMAGE_PNG_VALUE` static map bytes.

**Disputes & Reviews (`/disputes`, `/reviews`)**
- `POST /disputes`, `GET /disputes`, `PUT /disputes/{id}/resolve`.
- `POST /reviews`, `GET /reviews`.

**System & Notifications (`/notifications`, `/admin/announcements`)**
- `GET /notifications`, `PUT /notifications/{id}/read`.
- `GET /announcements/active`.
- `POST /admin/announcements`, `PUT /admin/announcements/{id}/deactivate`, `DELETE /admin/announcements/{id}`.


# CampusServ — Backend Transactional Services (Pass 3 of 5)

This document covers the core operational lifecycle of CampusServ: from service requests and offers to job execution, payment escrow, and real-time WebSocket communications.

## 1. Request Service (`request-service`)

The `request-service` is the origin point for the marketplace workflow. It handles the posting of jobs and provider bidding.

### Data Schema
- **`service_categories`**: Core category details (`name`, `description`, `icon`, `bg`, `icon_color`).
- **`service_requests`**: Stores the actual job posting. Key columns include `requester_id`, `category_id`, `description`, `deadline`, `location`, `status` (`OPEN`, `ASSIGNED`, `COMPLETED`, `CANCELLED`), `budget_min`, `budget_max`, `timing_type`, `scheduled_date`, `location_type`, `delivery_mode`, `target_provider_id`, `escrow_held`.
- **`offers`**: Provider bids. Columns include `request_id`, `provider_id`, `price`, `eta`, `message`, `status` (`PENDING`, `ACCEPTED`, `DECLINED`).

### REST Endpoints
**Categories**
- `GET /categories`
- `POST /admin/categories`, `PUT /admin/categories/{id}`, `DELETE /admin/categories/{id}`

**Requests & Offers**
- `POST /requests`: Create a new request.
- `GET /requests`, `GET /requests/{id}`, `GET /requests/mine`: Fetch requests.
- `POST /requests/{id}/offers`: Provider submits an offer.
- `PUT /requests/{id}/offers/{offerId}/accept`: **Critical Flow.** Accepting an offer triggers a synchronous `POST /payments/escrow/lock` to the `payment-service` to hold funds, and a `POST /jobs` to `job-service` to transition the request into an active job.
- `PUT /requests/{id}/offers/{offerId}/decline`, `PUT /requests/{id}/offers/{offerId}/withdraw`.
- `PUT /requests/{id}/status`: Internal endpoint used by `job-service` to update request status post-completion.
- `GET /requests/{id}/location`, `PUT /requests/{id}/location`, `GET /requests/{id}/distance-estimate`.

---

## 2. Job Service (`job-service`)

The `job-service` manages the lifecycle of an accepted request.

### Data Schema
- **`jobs`**: Links `request_id`, `offer_id`, `requester_id`, and `provider_id`. State is tracked via `status` (`ACTIVE`, `PROOF_SUBMITTED`, `COMPLETED`, `DISPUTED`).
- **`job_proofs`**: Evidence of completion (e.g., photos). `job_id`, `file_url`, `notes`.
- **`job_status_history`**: Audit log of state transitions (`job_id`, `status`, `reason`, `changed_by`).

### REST Endpoints
- `POST /jobs`: Internal endpoint called by `request-service` upon offer acceptance.
- `GET /jobs`, `GET /jobs/{id}`, `GET /jobs/request/{requestId}`.
- `PUT /jobs/{id}/start`: Marks job as actively in progress.
- `POST /jobs/{id}/proofs`: Provider uploads proof of completion.
- `PUT /jobs/{id}/complete`: **Critical Flow.** Called by the requester. Marks job `COMPLETED`, synchronously calls `PUT http://payment-service/payments/release?jobId={id}` to release escrowed funds, updates `request-service` status to `COMPLETED`, and publishes a RabbitMQ event.
- `PUT /jobs/{id}/dispute`: Marks job `DISPUTED` and creates a dispute record in `supporting-service`.
- `PUT /admin/jobs/{id}/force-complete`, `PUT /admin/jobs/{id}/force-cancel`.

---

## 3. Payment Service (`payment-service`)

Handles all financial logic: wallet ledgers, Paystack integration, and escrow mechanisms.

### Data Schema
- **`wallets`**: Links `user_id` to `balance` and `pending_escrow`.
- **`wallet_transactions`**: Comprehensive ledger. Tracks `wallet_txn_id`, `paystack_reference`, `user_id`, `type` (`DEPOSIT`, `WITHDRAWAL`), `status` (`PENDING`, `SUCCESS`, `FAILED`), `amount`, `fees_charged`, `net_amount`, `balance_before`, `balance_after`, `payment_method`, etc.

### REST Endpoints
**Wallet Operations**
- `POST /wallet/deposit`, `POST /payments/wallet/deposit`: Initializes a Paystack deposit.
- `POST /wallet/withdraw`: Requests payout to Mobile Money/Bank.
- `GET /wallet`, `GET /wallet/transactions`.

**Escrow & System Operations**
- `POST /payments/escrow/lock`: Moves funds from `balance` to `pending_escrow`. Called by `request-service`.
- `PUT /payments/release`: Moves funds from the requester's `pending_escrow` to the provider's `balance`. Called by `job-service` upon job completion.
- `PUT /payments/escrow/split`: Admin function to divide escrowed funds between parties (used in dispute resolutions).
- `PUT /payments/refund`: Refunds escrow back to requester.

**Webhooks**
- `POST /payments/webhook`: Listens for Paystack events (e.g., `charge.success`). Validates payload signature via `PAYSTACK_WEBHOOK_SECRET` and credits `wallet`.

---

## 4. Real-Time Infrastructure (WebSockets)

Located in `supporting-service`, the WebSocket configuration (`WebSocketConfig.java`) utilizes STOMP over WebSockets for live chats and location tracking.

### Endpoint & Auth
- **Connection URL**: `/chats/ws/connect`
- **Authentication**: A custom `ChannelInterceptor` intercepts the `CONNECT` STOMP frame, parses the JWT from the `Authorization: Bearer <token>` header, verifies the signature natively using `JWT_SECRET`, and sets a custom `StompPrincipal`.

### Subscription Security
The interceptor dynamically guards `SUBSCRIBE` frames by querying the database via JDBC to ensure users only subscribe to authorized channels:
- **`topic/chat/{threadId}`**: Queries `chat_threads` to verify the user is either the `client_id` or `provider_id` for that specific thread.
- **`topic/task/{taskId}/provider-location`**: Queries `jobs` to verify the user is the `requester_id` or `provider_id` for that active job.
- **`topic/admin/**`**: Verifies the principal's JWT role is exactly `ADMIN`.


# CampusServ — Mobile App Architecture & Design System (Pass 4 of 5)

This document provides a deep dive into the frontend architecture of the CampusServ React Native (Expo) mobile application.

## 1. Project Structure

The mobile application is an Expo-managed React Native project written entirely in TypeScript. The `src/` directory is logically partitioned:
- `components/`: Shared UI components (Buttons, Inputs, Cards).
- `config/`: Environment loading (`env.ts`).
- `constants/`: Hardcoded maps or layout sizes.
- `navigation/`: React Navigation stack and tab routers.
- `screens/`: Feature-specific views grouped by domain (e.g., `auth/`, `core/`, `chat/`, `provider/`, `wallet/`).
- `services/`: Axios HTTP instances, WebSocket STOMP client, and Google Maps API wrappers.
- `store/`: Zustand global state management.
- `styles/`: Theme contexts and design tokens.
- `types/`: Global TypeScript interfaces.
- `utils/`: Helpers for date formatting, currency, etc.

## 2. State Management & Data Fetching

### Global State (Zustand)
The app uses `zustand` for lightweight, hook-based global state.
- **`authStore.ts`**: Centralized authentication state. Stores `accessToken`, `refreshToken`, `user`, and `roleMode` (`CLIENT` vs `PROVIDER`). It persists this data securely to the device keychain using `expo-secure-store`. The store manages automatic login validation on startup (`loadStoredAuth`).

### Server State (React Query)
The app utilizes `@tanstack/react-query` to manage asynchronous data fetching, caching, and background refetching (e.g., fetching lists of requests, jobs, or wallet transactions). This avoids redundant network calls and keeps the UI snappy.

## 3. Navigation Strategy

Routing is powered by `@react-navigation/native` (v7).

- **`AppNavigator.tsx`**: The root controller. It conditionally renders screens based on `useAuthStore().isAuthenticated`.
  - **Unauthenticated State**: Shows the Auth Stack (`RoleSelectScreen`, `SignInScreen`, `SignUpScreen`, `OtpVerifyScreen`, etc.).
  - **Authenticated State**: Renders a `BottomTabNavigator` with contextual tabs based on `roleMode`.
- **Client vs. Provider Modes**: The app is unified. A user with the `PROVIDER` role can toggle their `roleMode` to act as a `CLIENT` (to hire someone else). The `AppNavigator` reads `roleMode` from Zustand and dynamically injects either Client-centric screens (`PostRequestScreen`) or the `ProviderNavigator.tsx` stack (active jobs, listing edits).

## 4. API Integration & Real-Time Client

### Axios Configuration (`api.ts`)
- Configured with `BASE_URL` from `.env` (currently utilizing ngrok for local development).
- **Request Interceptor**: Automatically pulls the `accessToken` from `authStore` and injects the `Authorization: Bearer <token>` header.
- **Response Interceptor**: Designed to catch `401 Unauthorized` errors. It queues failed requests, attempts to hit the `/auth/refresh` endpoint with the `refreshToken`, updates the Zustand store, and replays the queued requests seamlessly.

### Custom STOMP Client (`socket.ts`)
Instead of relying on heavy polyfills for `@stomp/stompjs` (which often struggle in React Native environments), the app implements a custom, lightweight STOMP protocol wrapper directly over the native `WebSocket` object.
- Connects to `WS_BASE_URL` with the JWT passed as an `Authorization` header.
- Manages sub-protocols, heartbeat emulation, and topic subscriptions for real-time `TEXT` chats and GPS location coordinate broadcasts.

## 5. Design System

The app recently underwent a color-token refactor to move away from generic purples/greens to a branded, high-contrast palette.

### Brand Colors (`colors.ts`)
- **Primary Brand Blue**: `#004E98` (Dark mode variant: `#3A6EA5`)
- **Secondary Blue**: `#3A6EA5`
- **Action/Accent**: `#FF6700` (Orange — used exclusively for primary CTAs and active states).
- **Backgrounds**: `#EBEBEB` (Light gray for high-contrast separation against `#FFFFFF` cards).
- **Borders/Muted**: `#C0C0C0` / `#5C677D`.

### Theming
The app implements a custom `ThemeContext.tsx` that reads the device's system color scheme (via `useColorScheme()`) and provides the active `ThemeColors` object to all components. 

### UI Aesthetics
- **Glassmorphism**: Retained on overlay elements (like floating action buttons or modal backgrounds).
- **Typography**: Uses modern sans-serif fonts (Inter/Poppins) where available.
- **Micro-interactions**: Uses loading skeletons (`react-content-loader` equivalents) instead of generic spinners for fetching states.


# CampusServ — Admin Panel Architecture & Known Gaps (Pass 5 of 5)

This document maps out the Next.js admin dashboard and highlights architectural gaps and inconsistencies identified during this documentation process.

## 1. Admin Panel Architecture (`campusserv-admin`)

The admin panel is built using Next.js 14 with the App Router paradigm. It provides the university/platform administrators with complete oversight over verifications, finances, disputes, and user management.

### Tech Stack
- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS + `lucide-react` (Icons)
- **State Management**: Zustand (`adminAuthStore.ts`, `notificationStore.ts`)
- **Data Fetching/Tables**: `@tanstack/react-query` + `@tanstack/react-table`
- **Charting**: Recharts
- **Forms/Validation**: React Hook Form + Zod

### Routing Structure
The App Router utilizes route groups (`(auth)`, `(dashboard)`) to bypass nested layouts where necessary.
- **`/login`**: Admin authentication interface. Connects to `api-gateway/auth/login`.
- **`/` (Dashboard Home)**: High-level metrics via `GET /admin/counts`.
- **`/announcements`**: Broadcast platform-wide messages (`SystemAnnouncementController`).
- **`/categories`**: Manage service categories (`ServiceCategory`).
- **`/disputes`**: Review and resolve job disputes.
- **`/finance`**: Track platform ledger, escrowed balances, and wallet transactions.
- **`/jobs` & `/requests`**: Global oversight of the marketplace. Administrators can force-complete or force-cancel jobs in edge cases.
- **`/providers/pending` & `/verification`**: The primary operational queue. Admins review uploaded Student IDs and approve/reject profiles, changing `verification_status` on the User/ProviderProfile models.
- **`/users`**: Suspend/ban logic via `account_status`.

---

## 2. Identified Technical Gaps & Inconsistencies

During the documentation process, several architectural shortcuts and missing implementations were identified. These represent critical technical debt that should be addressed before a production launch.

### Security & Auth Gaps
- **Refresh Token Mechanism**: The `/auth/refresh` endpoint exists but appears to be partially stubbed. In `mobile/src/store/authStore.ts`, the frontend decodes the refresh token and clears auth if it's expired, but the backend's refresh endpoint logic needs full verification for security rotation.
- **`Wallet` entity location**: The `Wallet` entity is housed in `auth-service` rather than `payment-service` to ensure synchronous wallet creation upon signup. While pragmatic, this breaks domain-driven boundaries.

### Missing Migrations
- **Flyway Absence in Microservices**: While `auth-service` has Flyway configured (`classpath:db/migration`), `user-service`, `request-service`, `job-service`, and `supporting-service` lack a `db/migration` directory entirely. They rely on Hibernate's `ddl-auto: update`, which is extremely dangerous for production deployments and schema evolution.

### Communication & Resilience
- **RestTemplate usage**: Inter-service communication relies exclusively on `@LoadBalanced RestTemplate`. There is no circuit breaking (e.g., Resilience4j) implemented. If `payment-service` goes down, requests attempting to lock escrow will hang or fail abruptly.
- **Message Broker Dead-letter Queues (DLQ)**: The RabbitMQ event publishing (`publishStatusChangeEvent`) lacks DLQ configuration. Failed push notifications or sync events will be lost.

### Mobile Application
- **Missing Push Notification Setup**: The frontend handles STOMP WebSockets perfectly for foreground real-time updates, but there is no Expo Push Notification/FCM logic for offline/background notifications yet.



