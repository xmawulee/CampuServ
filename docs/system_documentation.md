# CampusServ — System Documentation & Technical Baseline

**Version:** 3.0 (Current Implementation Baseline)  
**Last Updated:** July 22, 2026  
**Repository Root:** `c:\Users\allen\Desktop\CampuServ`

---

## 1. Architecture Overview

CampusServ is a microservices-based errand and freelance service marketplace engineered for KNUST (Kwame Nkrumah University of Science and Technology). The platform allows university students to request campus service errands or upgrade their profiles to become verified service providers.

### High-Level System Architecture Diagram (Verbal)

The architecture consists of six Spring Boot core business microservices, one Spring Cloud API Gateway, one Netflix Eureka Discovery Server, a React Native (Expo) mobile client, and a Next.js web admin portal. All services share a single PostgreSQL database instance.

```
                                  ┌────────────────────────┐
                                  │ Next.js Admin Panel    │
                                  │ (Port 3000)            │
                                  └───────────┬────────────┘
                                              │ REST (Admin endpoints)
                                              ▼
┌──────────────────────┐         ┌────────────────────────┐
│ Expo Mobile Client   ├────────►│ API Gateway            │
│ (React Native)       │ REST /  │ (Spring Cloud Gateway) │
│                      │ WebSockets (Port 8080)            │
│                      │         └───────────┬────────────┘
└──────────┬───────────┘                     │
           │                                 │ REST (Downstream routing with
           │                                 │       X-User-Id / X-User-Role)
           │                                 ▼
           │                       ┌──────────────────┐
           │                       │  Eureka Server   │
           │                       │  (Port 8761)     │
           │                       └──────────────────┘
           │ WebSocket (Direct or via Gateway)
           ▼
  ┌──────────────────┐
  │ Supporting Svc   │◄──────────────────────────────────────────────────────┐
  │ (Port 8086)      │                                                       │
  └────────┬─────────┘                                                       │
           │                                                                 │
           │           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
           │           │ Auth Service │  │ User Service │  │ Request Svc  │  │
           │           │ (Port 8087)  │  │ (Port 8083)  │  │ (Port 8082)  │  │
           │           └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
           │                  │                 │                 │          │
           │                  ▼                 ▼                 ▼          │
           │         ┌──────────────────────────────────────────────────┐    │
           │         │               PostgreSQL Database                │    │
           │         │               (Port 5433 / `campusserv`)         │    │
           │         └──────────────────────────────────────────────────┘    │
           │                  ▲                 ▲                 ▲          │
           │                  │                 │                 │          │
           │           ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  │
           │           │ Job Service  │  │ Payment Svc  │  │ Supporting   │  │
           │           │ (Port 8084)  │  │ (Port 8085)  │  │ Service      │──┘
           │           └──────────────┘  └──────────────┘  └──────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ RabbitMQ Broker (Port 5672) - Event Exchanges:                             │
│ - `provider_verification_queue` / `provider.verification`                  │
│ - `user.status.updated` / `user.deleted`                                   │
│ - `admin_notifications_queue` / `admin.notifications`                      │
│ - `job-status-queue` / `provider.review.submitted`                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Communication Protocols
1. **External Client Integration:**
   - **REST APIs:** The Expo mobile client and Next.js admin portal send HTTP REST requests to backend services via `api-gateway` on port `8080`.
   - **Real-Time WebSockets:** STOMP over WebSockets connects mobile clients to `supporting-service` (routed through gateway at `/ws/chats` or directly to port `8086` in dev). Handles live chat, location tracking, and real-time alerts.
2. **Internal Microservice-to-Microservice Integration:**
   - **Synchronous REST:** Services invoke each other directly using Spring `@LoadBalanced RestTemplate` pointing to Eureka registration IDs (e.g., `http://payment-service/wallet/create`).
   - **Asynchronous Messaging:** Decoupled events are broadcast over **RabbitMQ** (Port `5672`). For example, when `job-service` updates job status, it publishes to `job-status-queue`, consumed by `supporting-service` to send STOMP alerts and persist notifications.

### Component Tech Stack & Versions

| Component | Language / Core Framework | Key Libraries & Features | Default Local Port |
|---|---|---|---|
| **Discovery Server** | Java 17 / Spring Boot 3.2.x | Spring Cloud Netflix Eureka Server | `8761` |
| **API Gateway** | Java 17 / Spring Boot 3.2.x | Spring Cloud Gateway, Reactive Netty, `JwtValidationGatewayFilterFactory`, Global CORS | `8080` |
| **Auth Service** | Java 17 / Spring Boot 3.2.x | Spring Security, JJWT (HS256), Flyway Migrations (V1–V43), Brevo Mail SDK | `8087` |
| **User Service** | Java 17 / Spring Boot 3.2.x | Hibernate JPA, PostgreSQL Driver | `8083` |
| **Request Service** | Java 17 / Spring Boot 3.2.x | Hibernate JPA, Spring AMQP (RabbitMQ) | `8082` |
| **Job Service** | Java 17 / Spring Boot 3.2.x | Hibernate JPA, Spring Scheduling (Job completion scheduler) | `8084` |
| **Payment Service** | Java 17 / Spring Boot 3.2.x | Paystack Java API, Spring Data JPA (Pessimistic Locking `findByUserIdForWrite`) | `8085` |
| **Supporting Service**| Java 17 / Spring Boot 3.2.x | Spring Message Broker (STOMP WebSockets), Google Maps Directions / Geocoding APIs | `8086` |
| **Mobile Client** | TypeScript / React Native | Expo (managed), React Navigation v7, Zustand, TanStack React Query v5, custom STOMP client | `8081` (Metro) |
| **Admin Panel** | TypeScript / Next.js 14 | App Router, Tailwind CSS, TanStack React Table & Query, Recharts, Lucide React | `3000` |
| **Infrastructure** | Docker Containers | PostgreSQL 15 (Port `5433`), RabbitMQ 3.12 (Ports `5672`/`15672`), Redis 7 (Port `6379`) | Container Ports |

### Gateway Routing Table
The `api-gateway` strips path prefixes where configured and routes incoming traffic downstream:

| Incoming Path Pattern | Target Destination | Strip Prefix? | Guard Filters Enforced |
|---|---|---|---|
| `/auth/**`, `/admin/providers/**`, `/admin/verification/**`, `/admin/users/**`, `/admin/counts` | `lb://auth-service` | No | `JwtValidation` (Exempts `/auth/login`, `/auth/register`, `/auth/refresh`, etc.) |
| `/users/**`, `/providers/**` | `lb://user-service` | No | `JwtValidation` |
| `/requests/**`, `/admin/requests/**`, `/categories/**`, `/admin/categories/**` | `lb://request-service` | No | `JwtValidation` (Exempts public `/categories`) |
| `/jobs/**`, `/admin/jobs/**` | `lb://job-service` | No | `JwtValidation` |
| `/payments/**`, `/admin/finance/**` | `lb://payment-service` | No | `JwtValidation` (Exempts `/payments/webhook`) |
| `/wallet/**` | `lb://payment-service` | No | `JwtValidation` |
| `/ws/chats`, `/ws/chats/**` | `lb:ws://supporting-service` | No | WebSocket STOMP passthrough |
| `/chats/**`, `/reviews/**`, `/disputes/**`, `/notifications/**`, `/location/**` + Admin endpoints | `lb://supporting-service` | No | `JwtValidation` |

---

## 2. Data Layer

The system runs on a single shared PostgreSQL database (`campusserv` on Docker port `5433`).

> [!WARNING]
> **Data Layer Boundary & Migration Inconsistency Risk:** 
> - Services share a single PostgreSQL database schema, referencing inter-service tables via plain `VARCHAR`/`UUID` columns rather than database foreign key constraints.
> - Only `auth-service` uses Flyway migration scripts (`auth-service/src/main/resources/db/migration/V1__...` through `V43__...`).
> - All other services rely on Hibernate `spring.jpa.hibernate.ddl-auto: update` or `validate` to sync entity definitions with tables.
> - Certain entities (such as `RefreshTokens`) were created via JPA mapping and later added in Flyway (`V38`), but deploying with `ddl-auto: validate` without Flyway enabled across all services introduces schema drift risk.

### Major Database Tables & Entities

#### 1. Auth Domain (`auth-service`)
* **`users`**: Core entity for user credentials, roles, and verification status.
  * *Fields:* `id` (PK, UUID), `email` (KNUST student email), `password_hash`, `full_name`, `primary_role` (STUDENT, PROVIDER), `secondary_role` (PROVIDER, NONE), `secondary_role_status` (PENDING_VERIFICATION, APPROVED, REJECTED, NONE), `active_role_view` (STUDENT, PROVIDER), `primary_role_verified` (Boolean), `is_verified` (Boolean), `account_status` (ACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION), `service_category`, `rejection_count`, `completed_jobs_count`, `created_at`, `updated_at`.
* **`refresh_tokens`**: Active and revoked refresh token records for JWT session rotation.
  * *Fields:* `id` (PK), `user_id` (FK to users), `token_hash`, `expires_at`, `revoked_at`, `replaced_by_token_id`, `created_at`.
* **`email_verification_tokens`**: One-time email verification hashes for new signups.
  * *Fields:* `id`, `user_id`, `token_hash`, `expires_at`.

#### 2. User & Provider Profiles Domain (`user-service`)
* **`provider_profiles`**: Detailed portfolio and rating metrics for service providers.
  * *Fields:* `id` (PK, 1:1 with users.id), `bio`, `rating` (DECIMAL), `total_reviews` (Integer), `completed_jobs_count` (Integer), `portfolio_urls` (Text list), `approval_status` (VERIFIED, REJECTED, SUSPENDED, PENDING), `rejection_reason`.
* **`service_categories`**: Service genres (e.g. Tutoring, Laundry, Errands).
  * *Fields:* `id` (PK), `name` (Unique), `description`, `icon_key`, `bg_color`, `icon_color`.
* **`provider_services`**: Links providers to categories with custom base prices.
  * *Fields:* `id` (PK), `provider_id` (FK to users), `category_id` (FK to service_categories), `base_price` (DECIMAL).

#### 3. Marketplace Requests & Offers Domain (`request-service`)
* **`service_requests`**: Errands and tasks posted by student clients.
  * *Fields:* `id` (PK), `requester_id` (FK to users), `category_id` (FK to service_categories), `description`, `deadline` (Timestamp), `location` (Text description), `status` (OPEN, ASSIGNED, COMPLETED, CANCELLED), `budget_min`, `budget_max`, `timing_type`, `scheduled_date`, `location_type` (ON_SITE, REMOTE), `delivery_mode`, `target_provider_id`, `escrow_held` (Boolean).
* **`offers`**: Bids submitted by service providers.
  * *Fields:* `id` (PK), `request_id` (FK to service_requests), `provider_id` (FK to users), `price` (DECIMAL), `eta` (Text), `message`, `status` (PENDING, ACCEPTED, DECLINED, WITHDRAWN).
* **`request_attachments`**: Attachment metadata and file URLs.
* **`request_locations`**: Geo-coordinates (lat/lng) associated with requests.

#### 4. Job Execution Domain (`job-service`)
* **`jobs`**: Active or completed contract resulting from an accepted offer.
  * *Fields:* `id` (PK, job-XXXX), `request_id`, `offer_id`, `requester_id`, `provider_id`, `service_mode` (ON_SITE, REMOTE), `agreed_price` (DECIMAL), `status` (ACTIVE, IN_PROGRESS, AWAITING_CODE, PROOF_SUBMITTED, COMPLETED, CANCELLED, DISPUTED), `completion_code` (6-digit OTP for on-site completion), `created_at`, `updated_at`.
* **`job_proofs`**: Photos/notes submitted by providers to prove work completion.
  * *Fields:* `id` (PK), `job_id`, `file_url`, `notes`, `submitted_at`.
* **`job_status_history`**: Audit trail of state transitions for jobs.

#### 5. Wallet Ledger & Financial Domain (`payment-service`)
* **`student_wallets`**: Balance tracking for student deposits and escrow holds.
  * *Fields:* `user_id` (PK), `balance` (GHS), `held_balance` (escrow locked), `currency`, `version` (Optimistic lock).
* **`provider_wallets`**: Balance tracking for provider withdrawable earnings.
  * *Fields:* `user_id` (PK), `balance` (GHS), `currency`, `version`.
* **`student_wallet_transactions`**: Append-only transaction ledger for students.
  * *Fields:* `id`, `wallet_txn_id`, `user_id`, `type` (DEPOSIT, ESCROW_HOLD, ESCROW_RELEASE, ESCROW_REFUND), `status`, `amount`, `balance_before`, `balance_after`, `reference_id`, `related_job_id`, `narration`.
* **`provider_wallet_transactions`**: Append-only transaction ledger for providers.
  * *Fields:* `id`, `wallet_txn_id`, `user_id`, `type` (JOB_PAYOUT, WITHDRAWAL, COMMISSION_DEDUCTED), `status`, `amount`, `balance_before`, `balance_after`, `reference_id`, `related_job_id`, `narration`.
* **`transactions`**: Escrow and Paystack reference log.
  * *Fields:* `id`, `job_id`, `amount`, `paystack_reference`, `status`, `escrow_status`, `platform_commission`, `provider_payout`, `confirmed_at`.
* **`payout_methods`**: Saved Mobile Money (MoMo) / bank details for provider cash-outs.

#### 6. Support & Communication Domain (`supporting-service`)
* **`chat_threads`**: Active chat channels linking client and provider per request/job.
* **`chat_messages`**: Chat text records sent over WebSocket.
* **`reviews`**: Provider rating entries (1–5 stars, review comment).
* **`disputes`**: Conflict resolution tickets raised by users.
* **`notifications`**: Persistent in-app user notifications.
* **`admin_notifications`**: Platform alert feed for administrators.

---

## 3. API Surface

### REST Endpoints Inventory

#### 1. Auth Service (`auth-service`, Port 8087)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | Body: `{ email, password, fullName, role }` | Register student or provider account |
| `POST` | `/auth/login` | Public | Body: `{ email, password }` -> Returns `{ accessToken, refreshToken, user }` | Authenticate user & issue tokens |
| `POST` | `/auth/refresh` | Public | Body: `{ refreshToken }` -> Returns `{ accessToken, refreshToken }` | Rotate refresh token and issue new access token |
| `GET` | `/auth/verify-email` | Public | Query: `?token=...` | Verify student email link |
| `GET` | `/auth/check-status` | Public | Query: `?email=...` | Returns role & verification status for an email |
| `POST` | `/auth/resend-verification` | Public | Body: `{ email }` | Re-send verification link |
| `POST` | `/auth/upload-id` | Authorized | Multipart: `file` | Upload student ID card photo |
| `POST` | `/admin/verification/{userId}/approve` | Admin Only | Path var: `userId` | Approve provider application |
| `POST` | `/admin/verification/{userId}/reject` | Admin Only | Body: `{ reason }` | Reject provider application |
| `GET` | `/admin/users` | Admin Only | Response: List of user objects | List all registered users |
| `GET` | `/admin/counts` | Admin Only | Response: Summary metrics | System aggregate counts |

#### 2. User Service (`user-service`, Port 8083)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `GET` | `/users/{id}` | Authorized | Response: `UserProfileDTO` | Get public user profile |
| `PUT` | `/users/{id}/profile` | Authorized | Body: Profile fields | Update bio / profile information |
| `POST` | `/users/{id}/profile-picture` | Authorized | Multipart `file` | Upload profile image |
| `GET` | `/providers` | Authorized | Query: `?category=...` | List approved service providers |
| `POST` | `/providers/{id}/services` | Authorized | Body: `{ categoryId, basePrice }` | Add service listing to provider |
| `POST` | `/providers/{id}/portfolio` | Authorized | Multipart `files` | Upload portfolio photos |

#### 3. Request Service (`request-service`, Port 8082)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `GET` | `/categories` | Public | Response: List of category items | Get canonical service categories |
| `POST` | `/requests` | Authorized | Body: Service request payload | Create new errand posting |
| `GET` | `/requests` | Authorized | Query: status/category filters | List open service requests |
| `GET` | `/requests/{id}` | Authorized | Response: Request details + offers | Get request details and bid offers |
| `POST` | `/requests/{id}/offers` | Provider | Body: `{ price, eta, message }` | Submit a bid offer |
| `PUT` | `/requests/{id}/offers/{offerId}/accept` | Client | Path vars: `id`, `offerId` | Accept offer (locks escrow & creates job) |

#### 4. Job Service (`job-service`, Port 8084)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `POST` | `/jobs` | Internal Only | Body: Job creation payload | Initialize job contract (called by Request Service) |
| `PUT` | `/jobs/{id}/start` | Authorized | Path var: `id` | Mark job state as IN_PROGRESS |
| `POST` | `/jobs/{id}/proofs` | Authorized | Multipart files + notes | Upload job completion proof |
| `PUT` | `/jobs/{id}/complete` | Client | Body: `{ completionCode }` (if on-site) | Complete job & release escrow to provider |
| `PUT` | `/jobs/{id}/dispute` | Authorized | Body: `{ reason }` | Mark job as DISPUTED |
| `PUT` | `/admin/jobs/{id}/force-complete` | Admin Only | Body: `{ reason }` | Force complete job and release funds |
| `PUT` | `/admin/jobs/{id}/force-cancel` | Admin Only | Body: `{ reason }` | Force cancel job and refund client |

#### 5. Payment Service (`payment-service`, Port 8085)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `POST` | `/wallet/deposit` | Authorized | Body: `{ amount }` -> Returns Paystack URL | Initialize Paystack deposit checkout |
| `POST` | `/payments/webhook` | Public | Paystack webhook event payload | Handle Paystack deposit confirmation |
| `POST` | `/wallet/create` | Internal Only | Body: `{ userId }` | Initialize student and provider wallets |
| `POST` | `/payments/escrow/lock` | Internal Only | Body: `{ userId, amount, jobId }` | Lock student funds into escrow (`held_balance`) |
| `PUT` | `/payments/release` | Internal Only | Body: `{ jobId }` | Release escrow funds to provider balance |
| `PUT` | `/payments/escrow/split` | Admin Only | Body: `{ jobId, clientAmount, providerAmount }` | Split disputed funds between parties |
| `PUT` | `/payments/refund` | Internal Only | Body: `{ jobId }` | Refund escrow balance to student |
| `GET` | `/payments/student/wallet` | Authorized | Response: `StudentWalletDTO` | Get client wallet balance & ledger |
| `GET` | `/payments/provider/wallet` | Authorized | Response: `ProviderWalletDTO` | Get provider earnings wallet & ledger |
| `POST` | `/payments/provider/wallet/withdraw` | Authorized | Body: `{ amount, payoutMethodId }` | Process provider earnings payout |

#### 6. Supporting Service (`supporting-service`, Port 8086)
| Method | Path | Auth Requirement | Request / Response Summary | Description |
|---|---|---|---|---|
| `GET` | `/chats/thread/request/{requestId}` | Authorized | Path var: `requestId` | Fetch chat thread ID for request |
| `GET` | `/chats/history/{threadId}` | Authorized | Path var: `threadId` | Get message history for chat thread |
| `POST` | `/location/task/{taskId}/arrive` | Authorized | Path var: `taskId` | Report provider arrival at location |
| `GET` | `/location/reverse-geocode` | Authorized | Query: `?lat=...&lng=...` | Reverse geocode coordinates via Google Maps |
| `GET` | `/location/places-autocomplete` | Authorized | Query: `?input=...` | Address search autocomplete |
| `GET` | `/location/static-map` | Authorized | Query: coordinates | Returns PNG map image bytes |
| `POST` | `/disputes` | Authorized | Body: `{ jobId, reason }` | Create a dispute ticket |
| `GET` | `/notifications` | Authorized | Response: List of notifications | Get user notification feed |

---

### WebSocket & STOMP Destinations

Clients connect to STOMP WebSockets via `/ws/chats` (Gateway Port 8080) or directly to port `8086` (`/chats/ws/connect`).

#### STOMP Topics & Access Rules:
1. **`/topic/chat/{threadId}`**: Chat messages. Enforced: Only conversation participants allowed.
2. **`/topic/task/{taskId}/provider-location`**: Provider GPS updates. Enforced: Job client and provider allowed.
3. **`/topic/user/{userId}/notifications`**: Push-type user alerts. Enforced: Target `userId` allowed.
4. **`/topic/user/{userId}/status`**: Verification approval/rejection alerts. Enforced: Target `userId` allowed.
5. **`/topic/user/{userId}/completion-code`**: 6-digit OTP code broadcasts. Enforced: Target `userId` allowed.
6. **`/topic/admin/notifications`**: System admin alerts. Enforced: Requires `ADMIN` role.
7. **`/topic/announcements`**: Broadcast announcements. Public / All authenticated users.
8. **`/topic/provider/{providerId}/job-updates`**: Dashboard job state changes. *Unprotected.*
9. **`/topic/job.{jobId}.status`**: Real-time job status updates. *Unprotected.*

---

### Async Events (RabbitMQ Queue & Exchange Mapping)

| Queue / Exchange | Publisher | Consumer | Payload Structure | Action Triggered |
|---|---|---|---|---|
| `job-status-queue` | `job-service` | `supporting-service` | `{ jobId, status, requesterId, providerId, requestId, completionCode }` | Creates in-app notifications, unlocks chat threads, and updates job counters |
| `provider_verification_queue` | `auth-service` | `supporting-service` | `{ providerId, status, reason }` | Persists notification record and pushes STOMP alert to `/topic/user/{userId}/status` |
| `admin_notifications_queue` | `auth-service`, `request-service`, `job-service` | `supporting-service` | `{ type, entityId, summary, severity }` | Saves admin alert and broadcasts to `/topic/admin/notifications` |
| `provider.verification` | `auth-service` | `user-service` | `{ providerId, status, reason }` | Syncs approval status in `ProviderProfile` |
| `user.status.updated` | `auth-service` | `user-service` | `{ userId, status }` | Updates provider profile state on user suspension/ban |
| `provider.review.submitted` | `supporting-service` | `user-service` | `{ providerId, rating }` | Recalculates and updates provider average star rating |
| `user.deleted` | `auth-service` | `user-service` | `{ userId }` | Sets provider profile approval status to DELETED |

---

## 4. Authentication & Authorization

### End-to-End Authentication Flow
1. **Credentials Validation:** Auth Service checks KNUST email and BCrypt-hashed password.
2. **JWT Issuance:** Auth Service generates an HS256 JWT containing `sub` (User ID) and `role` claims, along with a secure refresh token.
3. **Gateway Verification:** `api-gateway` executes `JwtValidationGatewayFilterFactory` on non-public endpoints. It checks token signature, verifies the user is not in the in-memory `revokedUsers` deny-list, and rejects tokens marked `pendingVerification`.
4. **Identity Header Injection:** Upon successful token validation, the Gateway mutates downstream requests by injecting:
   - `X-User-Id`: Authenticated user ID string
   - `X-User-Role`: Active user role (`STUDENT`, `PROVIDER`, `ADMIN`)
   - `X-Internal-Auth`: Shared internal secret key
5. **Downstream Execution:** Microservices read `X-User-Id` and `X-User-Role` from HTTP headers without re-verifying the JWT signature.

### Role-Based Access Control
* **Gateway Level:** Intercepts routes matching `/admin/**`. Rejects requests with HTTP `403 Forbidden` if `X-User-Role` is not `ADMIN`.
* **Dual Roles:** Users can hold both `STUDENT` and `PROVIDER` roles. The active mode is determined by `users.active_role_view`, which controls the `X-User-Role` claim set in generated JWTs.
* **Microservice Level:** Microservices check `X-User-Role` for role-specific operations (e.g. `request-service` ensures only providers can call `/requests/{id}/offers`).

---

## 5. Frontend (Mobile App)

The mobile client is an Expo-managed React Native app located in `/mobile`.

### Screen Inventory

#### 1. Auth & Onboarding Flow
* `RoleSelectScreen`: Choose between Student signup and Provider signup.
* `SignInScreen`: Login form for credentials.
* `ClientSignUpScreen` & `ProviderSignUpScreen`: Registration forms for student/provider roles.
* `VerifyEmailScreen`: Awaits deep-link email verification.
* `IdCaptureScreen`: Camera and file picker for student ID card uploads.
* `CategorySelectScreen`: Multi-select picker for provider service categories.
* `PendingApprovalScreen`: Polling view for pending provider approval.
* `RejectedApplicationScreen`: Displays rejection feedback with ID re-upload capabilities.
* `AccountRestrictedScreen`: Display blocker for suspended or banned users.

#### 2. Student Core Flow (`AppTabs`)
* `HomeScreen`: Category grid, active request feed, notification entry point.
* `PostRequestScreen`: Errand creation form with map pin picker, budget sliders, and timing modes.
* `SelectProviderScreen`: Provider search and category filtering browser.
* `RequestDetailsScreen`: Request details, submitted provider offers, bid acceptance.
* `ActiveJobScreen`: Active job tracking, 6-digit OTP completion code display, static map routing.
* `RateProviderScreen` / `ReviewSubmissionScreen`: Star rating and comment submission form.

#### 3. Provider Core Flow (`ProviderNavigator`)
* `ProviderDashboardHomeScreen`: Daily earnings stats, matching nearby request feed.
* `IncomingRequestsScreen`: New errand lead list.
* `ProviderJobListScreen`: Filterable job list (Active, Proof Submitted, Completed).
* `CreateEditListingScreen`: Base price and service category configuration panel.
* `RequestDetailForProviderScreen`: Detailed request view with bid offer submission modal.

#### 4. Settings, Chat & Wallet
* `StudentWalletScreen`: Client deposit wallet, escrow held balance, transaction history.
* `ProviderWalletScreen`: Provider earnings wallet, payout withdrawal triggers, ledger history.
* `DepositScreen` & `WithdrawalScreen`: Paystack deposit integration and MoMo withdrawal forms.
* `TransactionReceiptScreen` & `WalletReceiptScreen`: Detailed transaction receipt view.
* `ChatScreen`: STOMP real-time messaging screen between client and provider.
* `SettingsScreen`: User profile details, avatar upload, role switching, dark mode toggle.

### State Management
* **Global Auth Store (`authStore.ts`):** Built with **Zustand**, persisted locally via `expo-secure-store`. Manages `accessToken`, `refreshToken`, `user` object, and active `roleMode`. Handles active view switching (`/auth/users/me/active-role-view`).
* **Server State:** Handled by **TanStack React Query v5** for caching request feeds, job lists, notifications, and profile details.
* **Local Component State:** Native `useState` for form fields, modal visibility, and map viewport coordinates.

### Navigation Structure
`AppNavigator.tsx` serves as the root router:
- Unauthenticated -> Auth Stack (`SignInScreen`, `SignUpScreen`, etc.)
- Account Status `SUSPENDED` -> `AccountRestrictedScreen`
- `primaryRoleVerified === false` -> `IdCaptureScreen` / `PendingApprovalScreen`
- Active View `PROVIDER` -> `ProviderNavigator` (Bottom Tabs: Home, Requests, Jobs, Earnings, Account)
- Active View `STUDENT` -> `AppTabs` (Bottom Tabs: Explore, Requests, Escrow Wallet, Account)

### Design System Colors (`colors.ts`)
* **Primary Brand Blue:** `#004E98` (Dark Mode: `#3A6EA5`)
* **Secondary Blue:** `#3A6EA5` (Dark Mode: `#5A8EC5`)
* **Accent Orange:** `#FF6700` (Dark Mode: `#FF8534` - Primary action buttons)
* **Backgrounds:** Light Gray `#EBEBEB` (Light Mode) vs Dark Navy `#0D1B2A` (Dark Mode)
* **Cards:** White `#FFFFFF` (Light Mode) vs Slate `#1A2A3E` (Dark Mode)
* **Borders:** `#C0C0C0` (Light Mode) vs `#2E4060` (Dark Mode)

---

## 6. Admin Panel

The Next.js admin dashboard is located in `/campusserv-admin`.

### Route & Page Inventory
* **`/login`**: Admin authentication form (`admin@campusserv.com`).
* **`/` (Dashboard)**: Metric cards (Total Users, Active Jobs, Total Escrow) with Recharts trend charts.
* **`/verification` & `/providers`**: Provider verification queue with lightbox viewer for student ID cards and Approve/Reject controls.
* **`/users`**: User list with status toggles (Active, Suspend, Ban).
* **`/jobs`**: Active job monitor with **Force Complete** and **Force Cancel** action modals (requires mandatory audit reason).
* **`/categories`**: Category management (Add/edit categories, icons, and colors).
* **`/disputes`**: Dispute ticket management table.
* **`/finance`**: Transaction ledger and escrow tracking auditor.
* **`/announcements`**: System broadcast announcement creation form.
* **`/reports`**: Metric summaries and platform reports.

---

## 7. Features: Implemented vs. Partially Implemented vs. Stubbed

### Fully Implemented
1. **JWT Auth & Session Rotation:** BCrypt hashing, JWT generation, Gateway validation, header mutation (`X-User-Id`, `X-User-Role`), and refresh token rotation.
2. **Role Verification Gate:** Onboarding routing gate blocking unverified or restricted accounts from accessing protected views.
3. **Provider Upgrade Flow:** Provider application, student ID photo upload, category selection, and admin approval queue.
4. **Split Wallet Ledger:** Separate `StudentWallet` (escrow holds) and `ProviderWallet` (withdrawable earnings) with append-only ledger transaction logging.
5. **Job Lifecycle & Escrow:** Task posting, provider bidding, offer acceptance, escrow locking, completion proof uploads, and OTP code release validation.
6. **Admin Audit Actions:** Force Complete and Force Cancel operations requiring mandatory written audit reasons.

### Partially Implemented
1. **Paystack Payment Integration:** Deposit checkout URLs initialize successfully; webhooks and withdrawals are simulated in local development because Paystack webhooks require a public URL (ngrok/Cloudflare tunnel) to hit `http://localhost:8085`.
2. **Location Services:** Static map rendering and Google Maps directions links are active; continuous background live GPS tracking falls back to foreground polling due to mobile OS background restrictions.

### Stubbed / Scaffolded
1. **`OtpVerifyScreen`:** Mobile screen is scaffolded; email verification is handled via direct deep-link clicking (`/auth/verify-email`).
2. **Admin Reports Export:** Report data visualizations render in UI, but PDF/CSV file export triggers return placeholder alerts.

---

## 8. Known Gaps, Risks, and Technical Debt

1. **Schema Migration Inconsistency:** Only `auth-service` implements Flyway (`V1`–`V43`). Other services rely on Hibernate `ddl-auto: update`. Running in production with `ddl-auto: validate` will cause startup failures if tables differ.
2. **Unprotected WebSocket Channels:** Subscriptions to `/topic/provider/{providerId}/job-updates` and `/topic/job.{jobId}.status` do not validate channel authorization, allowing authenticated users to subscribe to job events of other users.
3. **Synchronous Inter-Service Calls Without Circuit Breakers:** Direct `@LoadBalanced RestTemplate` calls (e.g., Request Service calling Payment Service to lock escrow) lack Resilience4j circuit breakers. A failure in Payment Service causes Request Service calls to hang and fail.
4. **In-Memory Gateway Deny-List:** `JwtValidationGatewayFilterFactory` maintains revoked users in a local `ConcurrentHashMap`. Restarting the API Gateway clears this deny-list, losing revoked token states before their natural expiration.
5. **Missing Message Broker DLQ:** RabbitMQ queues do not configure Dead-Letter Queues (DLQs). Unhandled message processing errors will cause message loss.
6. **Hardcoded Dev Secrets:** Insecure fallback values for `jwt.secret` and `internal.auth.secret` exist in `application.yml` for local development and must be strictly overridden in production.

---

## 9. Environment & Configuration

### Backend Services & Config Variables

| Service | Port | Required Env Variables | Purpose |
|---|---|---|---|
| **api-gateway** | `8080` | `JWT_SECRET`, `INTERNAL_SERVICE_SECRET` | Token validation & downstream proxying |
| **eureka-server** | `8761` | `eureka.instance.hostname` | Service discovery server |
| **auth-service** | `8087` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `EMAIL_VERIFICATION_URL` | User auth, verification emails, JWTs |
| **user-service** | `8083` | `SPRING_DATASOURCE_URL`, `POSTGRES_PASSWORD` | User profiles & categories |
| **request-service** | `8082` | `SPRING_DATASOURCE_URL`, `RABBITMQ_PASSWORD` | Service requests & provider bids |
| **job-service** | `8084` | `SPRING_DATASOURCE_URL` | Job execution & OTP validation |
| **payment-service** | `8085` | `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` | Wallet ledgers & escrow tracking |
| **supporting-service**| `8086` | `GOOGLE_API_KEY`, `REDIS_HOST`, `REDIS_PORT` | WebSockets STOMP broker, Google Maps |

### Mobile Client Config (`mobile/.env`)
* `API_BASE_URL`: Target Gateway URL (e.g. `http://10.0.2.2:8080` or tunnel URL).
* `WS_BASE_URL`: WebSocket endpoint (`ws://10.0.2.2:8086/chats/ws/connect`).
* `GOOGLE_MAPS_API_KEY`: Google Maps & Places API key.
* `PAYSTACK_PUBLIC_KEY`: Paystack public client key.

### Local Setup & Startup Command Sequence
1. **Boot Docker Containers:** Start PostgreSQL (port 5433), RabbitMQ (port 5672/15672), and Redis (port 6379):
   ```powershell
   docker-compose up -d
   ```
2. **Start Backend Microservices:**
   ```powershell
   cd backend
   .\start-all-headless.ps1
   ```
3. **Launch Admin Dashboard:**
   ```powershell
   cd campusserv-admin
   npm run dev
   ```
4. **Launch Expo Mobile Client:**
   ```powershell
   cd mobile
   npx expo start -c
   ```
