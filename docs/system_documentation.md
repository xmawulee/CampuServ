# CampusServ — Complete System Documentation (Current Implementation Baseline)

**Version:** 4.0  
**Last Updated:** July 2026  
**Repository Root:** `c:\Users\allen\Downloads\New folder\CampuServ`

---

## 1. Architecture Overview

CampusServ is a full-stack microservices marketplace platform designed for university campuses (specifically KNUST — Kwame Nkrumah University of Science and Technology). The platform bridges students who need campus errands/services with verified student service providers and freelancers.

### High-Level System Architecture Diagram (Verbal)

The system is structured around an **8-service Spring Boot backend ecosystem**, coordinated by Spring Cloud Gateway and Netflix Eureka, serving a **React Native (Expo) dual-role mobile app** and a **Next.js 14 Web Admin Portal**. All core services connect to a shared PostgreSQL database server while maintaining logically segregated tables per service domain.

```
                                      ┌────────────────────────┐
                                      │ Next.js Admin Portal   │
                                      │ (Port 3000)            │
                                      └───────────┬────────────┘
                                                  │ REST (Admin Endpoints)
                                                  ▼
┌─────────────────────────┐          ┌────────────────────────┐
│ React Native Mobile App ├─────────►│ API Gateway            │
│ (Expo / iOS & Android)  │ REST /   │ (Spring Cloud Gateway) │
│                         │ WS       │ (Port 8080)            │
└────────────┬────────────┘          └───────────┬────────────┘
             │                                   │ REST (Downstream routing with
             │                                   │       X-User-Id, X-User-Role)
             │                                   ▼
             │                        ┌──────────────────┐
             │                        │  Eureka Server   │
             │                        │  (Port 8761)     │
             │                        └──────────────────┘
             │ Direct / Gateway WS
             ▼
    ┌──────────────────┐
    │ Supporting Svc   │◄───────────────────────────────────────────────────────┐
    │ (STOMP/WebSocket)│  Async RabbitMQ Events (e.g., job.status.changed)      │
    │ (Port 8086)      │                                                        │
    └──────────────────┘                                                        │
             ▲                                                                  │
             │                    ┌─────────────────────────────────────────────┴─┐
             │ Synchronous REST   │       Core Business Microservices             │
             │ via RestTemplate   │                                               │
             │                    ├─────────────────┬─────────────────┬───────────┤
             │                    │  auth-service   │  user-service   │ request-  │
             │                    │  (Port 8087)    │  (Port 8083)    │ service   │
             │                    │                 │                 │ (8082)    │
             │                    ├─────────────────┼─────────────────┼───────────┤
             │                    │   job-service   │ payment-service │           │
             │                    │   (Port 8084)   │   (Port 8085)   │           │
             │                    └─────────────────┴─────────────────┴───────────┘
             │                                           │
             └───────────────────────────────────────────┴────────────────► PostgreSQL (Port 5432)
                                                                            & RabbitMQ (Port 5672)
```

### Microservices Inventory & Responsibilities

| Service Name | Local Port | Core Responsibility |
| :--- | :---: | :--- |
| **`api-gateway`** | `8080` | Single public entry point. Handles CORS, global JWT token validation (`JwtAuthenticationFilter`), route stripping, and downstream identity header injection (`X-User-Id`, `X-User-Email`, `X-User-Role`). |
| **`eureka-server`** | `8761` | Service discovery registry. Downstream microservices register dynamically to enable service-name-based load balancing. |
| **`auth-service`** | `8087` | User authentication, client/provider sign-up, KNUST student email validation (`@st.knust.edu.gh`), JWT issuance, password resets, and admin credential seeding. |
| **`user-service`** | `8083` | Student and Provider profiles, marketplace listing feeds, provider portfolio photo storage (`/users/files/**`), saved bookmarks (`saved_listings`), community moderation reports (`listing_reports`), and strict service category gating. |
| **`request-service`** | `8082` | Service requests (student job postings), service category catalog (`service_categories`), request attachments, and provider bidding (`offers`). |
| **`job-service`** | `8084` | Active job contracts (`jobs`), status lifecycle management (`PENDING_START` → `IN_PROGRESS` → `COMPLETED`), student/provider reviews, call logs, and dispute logging. |
| **`payment-service`** | `8085` | Financial ledger, student/provider wallets (`wallets`), transactions, escrow locking upon job start, Paystack gateway integration, and payout withdrawals. |
| **`supporting-service`**| `8086` | Real-time chat via STOMP/WebSockets (`/ws`), dispute message threads, system push notifications (consuming RabbitMQ events), FAQ catalog, and emergency contacts. |

### Technology Stack per Component

- **Backend Core:** Java 17, Spring Boot 3.2.0, Spring Cloud 2023.0.0, Spring Security, Spring Data JPA, Hibernate 6.x, Flyway DB Migrations, Lombok, JJWT 0.11.5, Paystack Java SDK.
- **Messaging & Cache:** RabbitMQ 3.12 (Event Brokering), Caffeine Cache / Spring Cache.
- **Database:** PostgreSQL 15 (Shared physical database instance, isolated logical table schema per service).
- **Mobile Client (`mobile`):** React Native 0.81.5, Expo 54, TypeScript 5.9, React 19, React Navigation 7 (Native Stack & Bottom Tabs), Zustand 5 (Global State), TanStack React Query 5 (Server State), Axios, Expo Secure Store, Expo Image Picker, STOMP WebSockets.
- **Admin Portal (`campusserv-admin`):** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React Icons, Axios.

### Gateway Routing Rules

The `api-gateway` strips prefixes and maps external URLs to internal Eureka service instances:

| External Path Pattern | Target Microservice | Strip Prefix | Authentication Requirement |
| :--- | :--- | :---: | :--- |
| `/auth/**` | `auth-service` | No | Public (Login, Register, Password Reset) |
| `/users/**`, `/providers/**` | `user-service` | No | Protected (Requires valid JWT Bearer) |
| `/api/users/**` | `user-service` | `StripPrefix=1` | Protected |
| `/requests/**`, `/categories/**` | `request-service` | No | Protected (Categories read is open) |
| `/api/requests/**` | `request-service` | `StripPrefix=1` | Protected |
| `/jobs/**` | `job-service` | No | Protected |
| `/payments/**`, `/wallet/**` | `payment-service` | No | Protected |
| `/api/v1/payments/**` | `payment-service` | `StripPrefix=2` | Protected |
| `/chats/**`, `/reviews/**`, `/disputes/**`, `/notifications/**`, `/ws/**`| `supporting-service`| No | Protected (WebSocket auth via token param/header) |
| `/admin/**` | Mapped per domain | Varies | Enforces `X-User-Role == 'ADMIN'` |

---

## 2. Data Layer

The platform utilizes a single shared PostgreSQL database (`campusserv`), with ownership of specific tables strictly divided among microservices.

### Table Ownership & Schema Definitions

#### 1. `auth-service` Owned Tables
- **`auth_users`**: Stores authentication credentials. Fields: `id` (UUID, PK), `email` (Unique, `@st.knust.edu.gh` enforced), `password_hash`, `role` (`STUDENT`, `PROVIDER`, `ADMIN`), `is_verified`, `created_at`.
- **`verification_tokens`** & **`password_reset_tokens`**: Stores OTP/tokens linked to `auth_users.id` with expiration timestamps.

#### 2. `user-service` Owned Tables
- **`users`**: Base profile information. Fields: `id` (UUID, PK), `full_name`, `phone_number`, `avatar_url`, `bio`, `rating`, `completed_jobs_count`, `service_category` (Comma-separated string of approved categories).
- **`provider_profile`**: Extended seller metadata. Fields: `user_id` (UUID, FK to `users`), `whatsapp_number`, `view_count` (BIGINT), `approval_status` (`PENDING`, `APPROVED`, `REJECTED`), `id_card_url`, `portfolio_urls` (Comma-separated image strings), `created_at`.
- **`provider_services`**: Individual ad listings posted by providers. Fields: `id` (UUID, PK), `provider_id`, `category_id`, `title`, `description`, `base_price`, `is_active`.
- **`provider_key_services`**: Element collection table storing short tag badges (e.g., `24hr Turnaround`, `Express Delivery`) linked to provider IDs.
- **`saved_listings`**: Stores student bookmarks. Fields: `id` (UUID, PK), `user_id` (Student ID), `provider_id` (Seller ID), `created_at`. Unique constraint on `(user_id, provider_id)`.
- **`listing_reports`**: Community moderation reports. Fields: `id` (UUID, PK), `reporter_id`, `provider_id`, `reason`, `details`, `created_at`.

#### 3. `request-service` Owned Tables
- **`service_categories`**: Global service catalog. Fields: `id` (String ID, e.g., `cat-1`), `name`, `icon_name`, `description`.
- **`service_requests`**: Student job postings. Fields: `id` (UUID, PK), `student_id`, `category_id`, `title`, `description`, `budget`, `location`, `status` (`OPEN`, `ASSIGNED`, `CANCELLED`), `created_at`.
- **`offers`**: Bids submitted by providers on requests. Fields: `id` (UUID, PK), `request_id`, `provider_id`, `proposed_price`, `message`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`).

#### 4. `job-service` Owned Tables
- **`jobs`**: Executed contracts. Fields: `id` (UUID, PK), `request_id`, `student_id`, `provider_id`, `agreed_price`, `status` (`PENDING_START`, `IN_PROGRESS`, `COMPLETED`, `DISPUTED`), `started_at`, `completed_at`.
- **`reviews`**: Ratings & feedback. Fields: `id`, `job_id`, `reviewer_id`, `reviewee_id`, `rating` (1-5), `comment`.
- **`disputes`**: Active conflict tickets linked to `jobs`. Fields: `id`, `job_id`, `initiator_id`, `reason`, `status` (`OPEN`, `RESOLVED`).

#### 5. `payment-service` Owned Tables
- **`wallets`**: Ledger accounts. Fields: `id`, `user_id` (Unique), `balance` (BigDecimal), `currency` (`GHS`), `updated_at`.
- **`escrow_accounts`**: Locked funds for active jobs. Fields: `id`, `job_id`, `amount`, `status` (`HELD`, `RELEASED`, `REFUNDED`).
- **`transactions`**: Audit trail. Fields: `id`, `wallet_id`, `amount`, `type` (`DEPOSIT`, `WITHDRAWAL`, `ESCROW_LOCK`, `PAYOUT`), `reference` (Paystack reference), `status`.

#### 6. `supporting-service` Owned Tables
- **`chat_rooms`** & **`chat_messages`**: Real-time communication records between students and providers.
- **`notifications`**: User push/in-app alert history. Fields: `id`, `user_id`, `title`, `message`, `is_read`, `created_at`.

### Migration Strategy & Technical Inconsistency Risk

- **Current Implementation:** Services such as `user-service`, `request-service`, and `job-service` include formal SQL migration scripts via **Flyway** (e.g., `V1__init.sql`, `V8__add_listing_feed_fields.sql`).
- **Inconsistency Risk:** Several service `application.yml` files simultaneously define `spring.jpa.hibernate.ddl-auto: update` (or `validate`). 
  - **BLUNT RISK ASSESSMENT:** Mixing auto-DDL updates with versioned Flyway scripts across multiple microservices connecting to the same physical database is a **major technical risk**. In staging/production, concurrent startup of microservices can cause table locks, race conditions, and unversioned schema drift. All production profiles must strictly enforce `ddl-auto: validate` with Flyway as the sole source of schema mutations.

---

## 3. API Surface

### Core REST Endpoints Inventory

#### `auth-service` (`/auth/**`)
| Method | Endpoint Path | Auth Req | Request Body / Params | Response Shape | Responsible Service |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | `{"email", "password"}` | `{"token", "userId", "role", "expiresIn"}` | `auth-service` |
| `POST` | `/auth/register/client` | Public | `{"email", "password", "fullName", ...}` | `{"message", "userId"}` | `auth-service` |
| `POST` | `/auth/register/provider` | Public | `{"email", "password", "category", ...}`| `{"message", "userId", "status"}` | `auth-service` |
| `POST` | `/auth/verify-email` | Public | `{"token"}` | `{"status": "VERIFIED"}` | `auth-service` |

#### `user-service` (`/users/**`, `/providers/**`)
| Method | Endpoint Path | Auth Req | Request Body / Params | Response Shape | Responsible Service |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/users/providers` | Protected | Query: `category`, `search`, `page`, `size` | `PaginatedList<UserProfileResponse>` (Hero photo, verified badge, rating, view count, isSaved) | `user-service` |
| `GET` | `/users/providers/{id}` | Protected | Path: `id` | `UserProfileResponse` (Atomically increments view count, returns tenure year) | `user-service` |
| `POST` | `/users/providers/{id}/save` | Protected | None | `{"status": "SAVED"}` (Idempotent toggle) | `user-service` |
| `DELETE`| `/users/providers/{id}/save` | Protected | None | `{"status": "UNSAVED"}` | `user-service` |
| `POST` | `/users/providers/{id}/report`| Protected| `{"reason", "details"}` | `{"status": "REPORTED"}` (Rate-limited, duplicate prevention)| `user-service` |
| `GET` | `/users/providers/{id}/listings`| Protected| Path: `id` | `List<ProviderServiceResponse>` | `user-service` |
| `POST` | `/providers/{id}/services` | Protected | `{"title", "category", "basePrice", ...}`| `ProviderServiceResponse` (**Enforces strict category approval**) | `user-service` |
| `PUT` | `/providers/{id}/services/{sId}`| Protected| `{"title", "basePrice", ...}` | `ProviderServiceResponse` | `user-service` |
| `DELETE`| `/providers/{id}/services/{sId}`| Protected| None | HTTP 204 No Content | `user-service` |
| `POST` | `/users/{id}/portfolio` | Protected | `MultipartFile file` | `{"url": "/users/files/..."}` (Syncs User & ProviderProfile) | `user-service` |
| `GET` | `/users/files/{filename}` | Public | Path: `filename` | Binary image stream | `user-service` |

#### `request-service` (`/requests/**`, `/categories/**`)
| Method | Endpoint Path | Auth Req | Request Body / Params | Response Shape | Responsible Service |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/categories` | Protected | None | `List<ServiceCategory>` | `request-service` |
| `POST` | `/requests` | Protected | `{"title", "categoryId", "budget", ...}`| `ServiceRequestResponse` | `request-service` |
| `GET` | `/requests` | Protected | Query: `status`, `category` | `PaginatedList<ServiceRequestResponse>`| `request-service` |
| `POST` | `/requests/{id}/offers` | Protected | `{"proposedPrice", "message"}` | `OfferResponse` (Provider bid) | `request-service` |
| `POST` | `/requests/{id}/offers/{oId}/accept`| Protected| None | `{"status": "ACCEPTED", "jobId": "..."}` | `request-service` |

#### `job-service` (`/jobs/**`)
| Method | Endpoint Path | Auth Req | Request Body / Params | Response Shape | Responsible Service |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/jobs` | Protected | Query: `role`, `status` | `List<JobResponse>` | `job-service` |
| `POST` | `/jobs/{id}/start` | Protected | None | `{"status": "IN_PROGRESS"}` (Locks escrow) | `job-service` |
| `POST` | `/jobs/{id}/complete` | Protected | None | `{"status": "COMPLETED"}` (Triggers payout)| `job-service` |
| `POST` | `/jobs/{id}/reviews` | Protected | `{"rating", "comment"}` | `ReviewResponse` | `job-service` |

#### `payment-service` (`/wallet/**`, `/payments/**`)
| Method | Endpoint Path | Auth Req | Request Body / Params | Response Shape | Responsible Service |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/wallet` | Protected | None | `{"balance", "currency", "escrowBalance"}`| `payment-service` |
| `POST` | `/wallet/deposit` | Protected | `{"amount", "reference"}` | `{"status": "SUCCESS", "newBalance"}` | `payment-service` |
| `POST` | `/wallet/withdraw` | Protected | `{"amount", "accountNumber", "bank"}` | `{"status": "PENDING"}` | `payment-service` |

### STOMP & WebSocket Destinations (`supporting-service` on Port 8086 / `/ws`)

| Destination Pattern | Type | Who Can Subscribe | What Triggers a Message |
| :--- | :---: | :--- | :--- |
| `/topic/chat.{roomId}` | Subscribe | Participants of `roomId` | Chat message sent via `/app/chat.send`. |
| `/topic/notifications.{userId}`| Subscribe | Target `userId` | System alerts (job assignment, dispute update, payment receipt). |
| `/topic/provider.{providerId}` | Subscribe | Any student viewing listing | Profile updates, view count changes, new ad services published. |
| `/app/chat.send` | Send | Authenticated user | Client payload containing message text, sender ID, and room ID. |

### Asynchronous Message Queue Events (RabbitMQ)

| Event Topic / Queue | Publisher | Consumer(s) | Payload Shape |
| :--- | :--- | :--- | :--- |
| `job.exchange` → `job.status.queue` | `job-service` | `supporting-service`, `payment-service` | `{"jobId", "studentId", "providerId", "status", "timestamp"}` |
| `provider.verification.queue` | `user-service`| `supporting-service`, `auth-service` | `{"providerId", "status": "APPROVED", "category"}` |

---

## 4. Authentication & Authorization

### End-to-End Identity Propagation

1. **Token Issuance:** When a user logs in via `/auth/login`, `auth-service` validates their credentials against `auth_users` and verifies that student emails match `@st.knust.edu.gh`. It signs a stateless JWT (HMAC-SHA256 using `JWT_SECRET`) embedding claims: `sub` (user UUID), `email`, and `roles` (`STUDENT`, `PROVIDER`, `ADMIN`).
2. **Gateway Interception:** The client includes `Authorization: Bearer <token>` on all requests. The `api-gateway` intercepts the call via `JwtAuthenticationFilter`.
3. **Stateless Verification:** The gateway verifies token signature and expiration without making synchronous database calls.
4. **Header Injection:** Upon successful validation, the gateway strips the `Authorization` header (to prevent spoofing downstream) and injects explicit trusted HTTP headers before forwarding the request to internal microservices:
   - `X-User-Id`: User UUID
   - `X-User-Email`: Student/Provider Email
   - `X-User-Role`: Active Role (`STUDENT`, `PROVIDER`, `ADMIN`)

### Role-Based Access Enforcement

- **Gateway Level:** Basic routing guards prevent unauthenticated requests from accessing `/users/**`, `/jobs/**`, or `/wallet/**`.
- **Service Level:** Business logic gating is strictly enforced inside microservice controllers and services:
  - **Strict Category Restriction:** In `UserController.java`, when a provider attempts to post or edit a service listing (`POST/PUT /providers/{id}/services`), the backend compares the target category against `user.getServiceCategory()`. If an approved provider attempts to post listings outside their approved category, the server returns HTTP `403 Forbidden` (`"You are approved strictly for category: X"`).
  - **Admin Enforcement:** All endpoints under `/admin/**` or administrative endpoints in core services check `request.getHeader("X-User-Role").equals("ADMIN")`.

---

## 5. Student Marketplace Feed & Provider Service Listings Architecture (Deep Dive)

This section documents the end-to-end implementation of the student discovery feed and provider service ad listings across the PostgreSQL database, Java Spring Boot backend, and React Native frontend.

### 1. Database Schema & Data Synchronization
- **`provider_services` Table (`user-service`):** Stores provider ad offerings. Fields: `id` (UUID, PK), `provider_id` (UUID, FK to `users`), `category_id` (String), `title` (String), `description` (Text), `base_price` (BigDecimal in GHS), `is_active` (Boolean), `created_at` (Timestamp).
- **`provider_key_services` Table:** Element collection storing short badge tags (e.g., `24hr Turnaround`, `Express Delivery`, `Certified Pro`) linked to provider IDs.
- **`saved_listings` Table:** Stores student bookmarking interactions. Unique constraint on `(user_id, provider_id)` ensuring idempotent toggles without duplicate rows.
- **`listing_reports` Table:** Moderation reports submitted by students. Fields: `reporter_id`, `provider_id`, `reason`, `details`, `created_at`.
- **Portfolio & Photo Data Synchronization:** When providers upload images via `POST /users/{id}/portfolio`, files are stored on disk in `/users/files/**` via `FileStorageService`. The backend updates both `User.portfolio` (list of strings) and `ProviderProfile.portfolioUrls` (comma-separated string), eliminating data fragmentation between general user profiles and seller listing carousels.

### 2. Backend API Surface & Enforcement Logic (`user-service`)
- **Feed Discovery Endpoint (`GET /api/users/providers`):**
  - *Query Parameters:* `category` (optional filter), `search` (keyword search against full name, bio, and key services), `page`, `size`.
  - *Response Model (`UserProfileResponse`):* Returns hero photo (`avatarUrl` or first portfolio image), verified checkmark status, star rating (`rating`), total completed jobs, live view count (`viewCount`), and an `isSaved` boolean (calculated by checking if a record exists in `saved_listings` for the calling user's `X-User-Id`).
- **Bisame-Style Detail Endpoint (`GET /api/users/providers/{id}`):**
  - Automatically and atomically increments `viewCount` in `ProviderProfile` upon each GET request.
  - Returns seller tenure calculation (e.g., `Member since 2025`).
- **Service Listings CRUD & Strict Category Gating (`POST/PUT/DELETE /providers/{id}/services`):**
  - *Strict Category Enforcement:* When a provider creates (`POST`) or edits (`PUT`) a listing, `UserController` fetches the provider's approved `serviceCategory` from `users.service_category`. If the submitted listing `category` does not match their approved domain, the server rejects the request with HTTP `403 Forbidden` (`"You are approved strictly for category: X. You cannot post listings in other categories."`).
- **Idempotent Bookmarking:** `POST /users/providers/{id}/save` and `DELETE /users/providers/{id}/save` add/remove rows in `saved_listings`.
- **Community Spam & Moderation Reporting:** `POST /users/providers/{id}/report` stores user complaints in `listing_reports` with rate-limiting and duplicate check prevention.

### 3. Mobile Frontend Implementation (`mobile/`)
- **Student Discovery & Feed Rendering:**
  - **`CategoryProvidersScreen.tsx` & `HomeScreen.tsx`:** Fetches provider feeds via TanStack React Query (`useQuery`). Filters dynamically by category pills and search inputs.
  - **`ProviderFeedCard.tsx`:** High-trust compact marketplace card design.
    - *URL Normalization (`getFullImageUrl`):* Automatically converts relative backend file paths (`/users/files/xxx.jpg`) into full network HTTP URLs using `EXPO_PUBLIC_API_URL` / `BASE_URL`.
    - *Visual Badging:* Displays an emerald green **"Verified Pro"** badge with checkmark (`#10B981`) for approved sellers, star rating badge (`RatingBadge`), view count (`x views`), and up to 3 quick specialty chips.
    - *Optimistic Save Toggle:* Interactive heart bookmark button that toggles local UI state instantly before confirming with backend save/unsave APIs.
- **Full Bisame-Style Marketplace Listing Page:**
  - **`ListingDetailScreen.tsx`:**
    - *Interactive Photo Carousel Selector:* Swipeable gallery rendering all images in `portfolioUrls` with thumbnail selectors.
    - *3 Direct Action CTAs:*
      1. **Chat:** Navigates directly to `ChatScreen` with a pre-configured STOMP chat session between student and provider.
      2. **Call Now:** Launches the mobile operating system's native phone dialer (`tel:${phoneNumber}`).
      3. **Request Quote:** Opens a custom project specification modal that pre-populates the target provider ID and service listing to initiate an order.
    - *3-Tab View Architecture:*
      1. **Description:** Provider bio, contact WhatsApp number, seller tenure, and verified credentials.
      2. **Key Services & Pricing:** List of active `ProviderService` cards with title, description, and base price in GHS, plus specialty tag badges.
      3. **Reviews:** Chronological feedback and ratings from verified completed jobs.
    - *Real-Time STOMP Socket Subscriptions:* Subscribes to `/topic/provider.${providerId}`. When a seller updates their pricing, bio, or uploads new photos, the listing detail screen refreshes dynamically without reloading.
- **Provider Management & Posting Experience:**
  - **`MyListingsScreen.tsx`:** Dedicated `"Listings"` bottom tab in the Provider dashboard. Renders active/inactive services with quick edit and delete triggers.
  - **`CreateEditListingScreen.tsx`:**
    - Comprehensive form capturing Title, Description, Base Price (GHS), WhatsApp contact number, detailed Bio textarea, and 10 one-tap specialty badge chips + custom tag adder.
    - *Photo Upload Gallery:* Integrates `expo-image-picker` to select up to 6 work sample photos from device gallery or camera, uploading via multipart form data to `POST /users/{id}/portfolio`.
    - *Visual Category Locking:* Reads the seller's approved category from `authStore`. In category selection controls, unapproved categories are rendered with dimmed opacity (`0.45`) and a padlock icon. Tapping a locked category displays an immediate Toast notice explaining category enforcement rules.
  - **`ProviderDashboardHomeScreen.tsx`:** Features a prominent **"Marketplace Listings & Services"** hero banner (`+ Post New Service` and `Manage All Services`) directing sellers to create and govern their offerings.

---

## 6. Frontend (React Native Mobile App)

The mobile client (`mobile/`) is a dual-role React Native (Expo) application. Students can seamlessly switch to their Provider Dashboard if approved.

### Comprehensive Screen Inventory (48 Screens)

#### 1. Authentication & Onboarding Flow (`src/screens/auth/`)
- **`SignInScreen.tsx`**: Email/password login form with secure token persistence in SecureStore.
- **`ClientSignUpScreen.tsx`**: Student registration requiring valid `@st.knust.edu.gh` email domain.
- **`ProviderSignUpScreen.tsx`**: Multi-step registration for service providers and freelancers.
- **`CategorySelectScreen.tsx`**: Selection grid for providers to choose their primary service specialization.
- **`IdCaptureScreen.tsx`**: KNUST Student ID card camera capture for provider verification.
- **`ProviderBioScreen.tsx`**: Onboarding step for providers to input bio, skills, and base rates.
- **`ProviderReviewScreen.tsx`**: Summary verification screen before application submission.
- **`PendingApprovalScreen.tsx`**: Status waiting screen for providers whose applications are under admin review.
- **`RejectedApplicationScreen.tsx`**: Notice screen displaying admin rejection reasons with re-application option.
- **`AccountRestrictedScreen.tsx`**: Lockout screen shown when an account is suspended for policy violations.
- **`RoleSelectScreen.tsx`**: Initial onboarding choice between Student Client and Service Provider flows.
- **`IdUploadScreen.DEPRECATED.tsx`**: *Stubbed/Deprecated scaffold* replaced by `IdCaptureScreen.tsx`.

#### 2. Student Client Core Flow (`src/screens/core/`)
- **`HomeScreen.tsx`**: Student dashboard featuring category pills, search bar, active job banners, and top-rated provider feed.
- **`CategoryProvidersScreen.tsx`**: Marketplace listing feed filtered by category, rendering high-trust `ProviderFeedCard` components.
- **`SearchScreen.tsx`**: Global search interface for finding providers, service requests, or specific offerings.
- **`SelectProviderScreen.tsx`**: Selection screen when reviewing multiple provider bids on a student's service request.
- **`PostRequestScreen.tsx`**: Multi-step form for students to post custom errand/service requests with budget and location.
- **`MyRequestsScreen.tsx`**: List view of student's posted requests grouped by status (`OPEN`, `ASSIGNED`, `COMPLETED`).
- **`RequestDetailsScreen.tsx`**: Comprehensive request view showing provider bids (`offers`), timeline, and contract acceptance CTA.
- **`ActiveJobScreen.tsx`**: Live execution tracking screen for an ongoing contract, featuring escrow status, chat button, and completion confirmation.
- **`ActiveNavigationScreen.tsx`**: Map-based tracking view for delivery/errand jobs.
- **`RiderLiveTrackingScreen.tsx`**: Location monitoring screen displaying provider GPS progress toward campus destination.
- **`RateProviderScreen.tsx`**: Post-job rating modal with 1-5 star selector and written review submission.
- **`ReviewSubmissionScreen.tsx`**: Success confirmation screen after submitting provider feedback.
- **`RaiseDisputeScreen.tsx`**: Conflict initiation form to freeze escrow funds and alert admin moderation.
- **`DisputeThreadScreen.tsx`**: Arbitration messaging interface between student, provider, and admin mediator.
- **`NotificationCenterScreen.tsx`**: Chronological feed of system alerts, bid notifications, and payment receipts.
- **`ProviderProfileScreen.tsx`**: Public seller view showing verified badge, bio, reviews, and completed job metrics.

#### 3. Service Provider Flow (`src/screens/provider/`)
- **`ProviderDashboardHomeScreen.tsx`**: Provider command center showing earnings summary, active order queue, and prominent **"Marketplace Listings & Services"** quick-action banner (`+ Post New Service`).
- **`MyListingsScreen.tsx`**: Dedicated management hub for the seller's active ad services and offerings (registered as core `"Listings"` tab).
- **`ListingDetailScreen.tsx`**: Full Bisame-style marketplace listing page with interactive photo carousel selector, seller tenure, view count auto-increment, 3 direct CTAs (**Chat**, **Call Now**, **Request Quote**), and 3-tab layout (**Description**, **Key Services & Pricing**, **Reviews**).
- **`CreateEditListingScreen.tsx`**: Comprehensive service posting/editing form featuring Contact/WhatsApp number, detailed bio textarea, 10 one-tap specialty badge chips, image upload gallery, and **visual category locking** (dimmed opacity `0.45` + padlock icons for unapproved categories).
- **`IncomingRequestsScreen.tsx`**: Feed of open student service requests matching the provider's approved category.
- **`RequestDetailForProviderScreen.tsx`**: Detailed view of a student request allowing providers to submit competitive bids (`offers`).
- **`ProviderJobListScreen.tsx`**: Order management screen tracking `PENDING_START`, `IN_PROGRESS`, and `COMPLETED` contracts.

#### 4. Real-Time Chat & Communication (`src/screens/chat/`)
- **`ChatScreen.tsx`**: Real-time messaging interface powered by STOMP/WebSockets, supporting text messages and image sharing.

#### 5. Financial & Wallet Flow (`src/screens/wallet/`)
- **`WalletScreen.tsx`**: Central financial dashboard displaying available balance, locked escrow balance, and transaction history.
- **`StudentWalletScreen.tsx`**: Student-tailored wallet view with instant Paystack deposit triggers.
- **`ProviderWalletScreen.tsx`**: Provider financial view highlighting earnings breakdown and payout withdrawal controls.
- **`DepositScreen.tsx`**: Amount input screen initiating Paystack mobile money/card payment gateways.
- **`WithdrawalScreen.tsx`**: Payout request form capturing Mobile Money (MoMo) number or bank account details.
- **`TransactionReceiptScreen.tsx`**: Detailed itemized receipt view for individual payment transactions.
- **`WalletReceiptScreen.tsx`**: Summary printable ledger statement for wallet funding and withdrawals.

#### 6. Settings & Preferences (`src/screens/settings/`)
- **`SettingsScreen.tsx`**: Profile configuration, role switcher toggle, notification preferences, and account logout.
- **`DialogPreviewScreen.tsx`**: Developer/QA preview harness for testing system modal dialogs and alert treatments.

### State Management Strategy

1. **Global Client State (`Zustand`):**
   - Implemented in `authStore.ts` and `locationStore.ts`.
   - **Why:** Lightweight, synchronous access to authentication state (`user`, `token`, `activeRole`). Persisted securely using `expo-secure-store` across app restarts without boilerplate.
2. **Server State (`TanStack React Query`):**
   - Used across feed components, job lists, and request views.
   - **Why:** Handles server data caching, background refetching, pagination, and optimistic UI updates (e.g., instant bookmark icon toggling in `ProviderFeedCard` before server acknowledgment).
3. **Local Component State (`React useState/useRef`):**
   - Used for transient UI controls: modal openness, carousel image index selection, custom tag input typing, and form validation error messages.

### Navigation Hierarchy (`AppNavigator.tsx`)

- **Root Switcher:** Evaluates `isAuthenticated` and `user.approvalStatus`.
- **Student Bottom Tabs (`ClientTabNavigator`):** `Home` (`HomeScreen`), `Requests` (`MyRequestsScreen`), `Post` (`PostRequestScreen`), `Alerts` (`NotificationCenterScreen`), `Account` (`SettingsScreen`).
- **Provider Bottom Tabs (`ProviderTabNavigator`):** `Dashboard` (`ProviderDashboardHomeScreen`), `Listings` (`MyListingsScreen` — *wired with dedicated tab icon*), `Orders` (`ProviderJobListScreen`), `Requests` (`IncomingRequestsScreen`), `Account` (`SettingsScreen`).
- **Modal / Push Stack:** Overlay routes accessible from either role (`ListingDetailScreen`, `RequestDetailsScreen`, `ChatScreen`, `WalletScreen`).

### Design System Implementation

- **Curated Palette (`colors.ts`):** Primary KNUST Blue (`#0056D2`), Emerald Green Verified/Success (`#10B981`), Slate Muted Text (`#64748B`), Dark Slate Header (`#0F172A`), Off-White Background (`#F8FAFC`).
- **Image URL Normalization:** Implemented `getFullImageUrl()` utility in feed and detail components to transform backend relative file paths (`/users/files/xxx.jpg`) into absolute HTTP network URLs using `BASE_URL`.
- **Reusable Core UI:** `ProviderFeedCard` (compact marketplace card with hero image, verified badge, rating, and save button), `RatingBadge`, `RoleSwitcher`.

---

## 7. Admin Panel (`campusserv-admin`)

Built with Next.js 14 (App Router) and Tailwind CSS, serving as the command center for KNUST campus moderators.

### Route Inventory & Capabilities

- **`/(auth)/login`**: Admin authentication portal requiring `ADMIN` role credentials.
- **`/(dashboard)/page.tsx`**: Platform analytics dashboard showing total volume, active escrow value, and pending verification counts.
- **`/users`**: Student directory with account suspension, password reset, and activity audit tools.
- **`/providers`**: Active provider catalog with manual category override and revocation controls.
- **`/verification`**: Critical moderation queue for reviewing submitted KNUST student ID cards (`id_card_url`) and approving or rejecting seller applications.
- **`/jobs`**: System-wide contract oversight displaying live status progression and escrow amounts.
- **`/finance`**: Financial controller interface for releasing locked escrow, reviewing withdrawal requests, and monitoring Paystack ledger reconciliations.
- **`/disputes`**: Arbitration desk allowing mediators to read dispute threads, override job outcomes, and refund escrow to students or release to providers.
- **`/reports`**: Community moderation queue displaying user-submitted listing reports (`listing_reports`) with dismiss or listing takedown actions.
- **`/categories`**: CRUD management catalog for campus service categories and icon assignments.
- **`/announcements`**: Broadcast messaging tool for sending system-wide push notifications.

---

## 8. Features Implemented vs. Partially Implemented vs. Stubbed

### 1. Fully Working Features
- **Dual-Role Authentication & Onboarding:** End-to-end student and provider signup, KNUST email validation, JWT authentication, and instant role switching.
- **Marketplace Listing Feed & Detail Experience:** High-trust seller cards (`GET /users/providers`), Bisame-style listing details (`GET /users/providers/{id}`) with photo carousel selector, seller tenure calculation, view count auto-increment, and direct action CTAs (Chat, Call Now, Request Quote).
- **Idempotent Saved Listings & Community Reporting:** Student bookmarking (`saved_listings`) and duplicate-protected listing reporting (`listing_reports`).
- **Strict Service Category Enforcement:** Full backend and frontend gating preventing providers from creating or editing service listings outside their approved specialty (with visual padlock icons on mobile).
- **Provider Listing & Portfolio Management:** Complete CRUD for provider ad services and multi-image portfolio work samples (`/users/files/**`).
- **Service Request & Bidding Lifecycle:** Student request posting, provider competitive bidding (`offers`), contract acceptance, and active job progression (`PENDING_START` → `IN_PROGRESS` → `COMPLETED`).
- **Real-Time STOMP Chat & Notifications:** Live messaging between students and providers, plus instant STOMP socket refreshes when provider profiles change.
- **Paystack Escrow & Wallet Ledger:** Student deposits, automatic escrow locking upon job start, and automated payout release upon job completion.

### 2. Partially Working Features (Exact Gaps Specified)
- **Live Rider / Provider Tracking (`RiderLiveTrackingScreen.tsx`):**
  - *What exists:* The mobile UI screen is implemented, rendering a map interface and polling location coordinates.
  - *What's missing:* Continuous background GPS telemetry broadcasting from driver/provider mobile devices is not hooked up to device background location services. Google Maps API polyline routing and turn-by-turn navigation calculation are simulated rather than connected to live mapping billing APIs.
- **AI Support Assistant & FAQ Catalog:**
  - *What exists:* Database tables for FAQs and emergency contacts in `supporting-service`, along with basic keyword-matching REST endpoints.
  - *What's missing:* Integration with an external Large Language Model (e.g., OpenAI or Gemini APIs) for conversational, generative AI customer support is not implemented; responses rely strictly on static database text matching.
- **Offline Data Sync:**
  - *What exists:* TanStack React Query caches fetched marketplace feeds and job lists during an active app session.
  - *What's missing:* Offline persistence across app restarts (e.g., SQLite or MMKV offline cache hydration) and background offline mutation queueing (for sending chat messages while offline) are not implemented.

### 3. Stubbed / Scaffolded Features
- **`IdUploadScreen.DEPRECATED.tsx`**: An early onboarding screen file preserved in the codebase as a stub/scaffold; fully superseded by the camera-enabled `IdCaptureScreen.tsx`.
- **Admin Data Export Batch Jobs**: Several CSV/PDF report export buttons in the Next.js admin panel render UI triggers and simple frontend data dumps, but lack asynchronous background batch processing or streaming server-side document generation.

---

## 9. Known Gaps, Risks, and Technical Debt

### 1. Database Schema & Migration Inconsistency (Severe Risk)
- **The Risk:** While `user-service`, `request-service`, and `job-service` contain versioned Flyway migration scripts, multiple service `application.yml` configurations still include `spring.jpa.hibernate.ddl-auto: update` (or `validate`). 
- **Impact:** In a multi-service architecture sharing a single PostgreSQL instance, concurrent microservice startup with `ddl-auto: update` can trigger database table locks, race conditions, and unversioned schema modifications.
- **Remediation:** All production profiles must disable Hibernate auto-DDL (`ddl-auto: validate` or `none`) and rely exclusively on Flyway for schema management.

### 2. Inter-Service Synchronous Coupling & Lack of Circuit Breakers
- **The Risk:** Synchronous communication between microservices relies on Spring `@LoadBalanced RestTemplate` (e.g., `job-service` calling `payment-service` to lock escrow) without Resilience4j circuit breakers, bulkheads, or custom timeout fallbacks.
- **Impact:** If `payment-service` or `user-service` experiences degradation or high latency, calling threads in `api-gateway` and downstream services will block indefinitely until TCP socket timeout. This can cause cascading thread-pool exhaustion across the entire campus platform.

### 3. RabbitMQ Consumer Reliability & Missing Dead-Letter Queues (DLQ)
- **The Risk:** Message listeners in `supporting-service` and `payment-service` process asynchronous RabbitMQ events without standardized Dead-Letter Exchanges (DLX) or exponential backoff retry policies defined in code.
- **Impact:** If a message payload fails deserialization or encounters a transient database lock during notification generation, the unacknowledged message may enter an infinite requeue loop or be silently dropped, leading to missed notifications or lost audit events.

### 4. Local Disk File Storage Incompatibility with Container Scaling
- **The Risk:** Provider ID cards and portfolio photos are saved directly to the local server filesystem (`/users/files/**`) via `FileStorageService`.
- **Impact:** While functional on a single-node server or local development machine, this architecture will break in horizontal cloud deployments (e.g., AWS ECS, Kubernetes, or Docker Swarm). Pod replicas will not have access to files saved on another container's local ephemeral disk without shared NFS or cloud object storage (e.g., AWS S3 or Cloudinary).

### 5. Client-Side JWT Revocation & Security Edge Case
- **The Risk:** User logout is implemented purely client-side by deleting the JWT from Expo SecureStore. 
- **Impact:** There is no server-side token blacklist or Redis token revocation store in `auth-service`. If a JWT is intercepted or compromised, an attacker can continue to authenticate against `api-gateway` until the token's natural timestamp expiration occurs.

---

## 10. Environment & Config

### Environment Variables Inventory

| Variable Name | Target Microservice(s) | Purpose / Description | Fallback / Default Value |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | All Backend Services | Activates Spring environment configuration (`local-dev`, `docker`, `prod`). | `local-dev` |
| `INTERNAL_SERVICE_SECRET`| All Backend Services | Shared secret for authenticating internal server-to-server REST requests. | `default_internal_service_secret...` |
| `JWT_SECRET` | `api-gateway`, `auth-service` | HMAC-SHA256 signing key for issuing and verifying stateless user tokens. | `dGhlLXN1cGVyLXNlY3JldC...` |
| `SPRING_DATASOURCE_URL` | Core Business Services | JDBC connection string for the shared PostgreSQL instance. | `jdbc:postgresql://localhost:5432/campusserv` |
| `DB_USERNAME` / `DB_PASSWORD`| Core Business Services | Database authentication credentials. | `postgres` / `password` |
| `RABBITMQ_HOST` / `PORT` | `user`, `job`, `payment`, `supporting` | Event broker connection host and port. | `localhost` / `5672` |
| `EUREKA_CLIENT_SERVICEURL`| All downstreams except Eureka| Registry endpoint where microservices announce their IP/port. | `http://localhost:8761/eureka/` |
| `PAYSTACK_SECRET_KEY` | `payment-service` | API key for verifying Paystack transactions and initiating transfers. | `sk_test_...` |
| `EXPO_PUBLIC_API_URL` | `mobile` (React Native) | Base URL for REST network requests pointing to API Gateway. | `http://192.168.1.100:8080` (LAN IP) |
| `EXPO_PUBLIC_SOCKET_URL` | `mobile` (React Native) | STOMP WebSocket server URL. | `http://192.168.1.100:8080/ws` |
| `NEXT_PUBLIC_API_URL` | `campusserv-admin` | API Gateway routing target for Next.js admin dashboard. | `http://localhost:8080` |

### Non-Obvious Manual Local Setup Steps

1. **Strict Service Startup Bootstrapping Order:**
   - Because services do not implement delayed retry loops for initial Eureka registration or RabbitMQ exchange declarations, local services **must** be launched in a strict dependency sequence:
     1. Start PostgreSQL (`5432`) and RabbitMQ (`5672`).
     2. Start **`eureka-server`** (`8761`) and wait for Tomcat initialization.
     3. Start **`api-gateway`** (`8080`) so route tables bind to Eureka.
     4. Launch downstream microservices (`auth`, `user`, `request`, `job`, `payment`, `supporting`).
   - *Note:* The repository root contains a PowerShell utility (`start-all-headless.ps1`) that automates this staggered boot sequence on Windows systems.
2. **Mobile Device Physical Testing LAN IP Binding:**
   - When running the React Native mobile app on a physical iOS or Android device via Expo LAN mode, setting `EXPO_PUBLIC_API_URL=http://localhost:8080` or `127.0.0.1` **will fail silently** because `localhost` resolves to the phone's internal loopback adapter.
   - Developers must manually inspect their PC's local WiFi IPv4 address (e.g., `ipconfig` → `192.168.x.x`) and hardcode it into `mobile/.env` before starting the Expo bundler (`npx expo start -c`).
3. **RabbitMQ Virtual Host & Queue Declarations:**
   - If starting RabbitMQ without the automated Spring boot initializers, the default virtual host (`/`) must be active, and services must have permissions to auto-declare topic exchanges (`job.exchange`, `provider.verification.exchange`). If an exchange type mismatch occurs (e.g., declaring a queue with mismatched Dead-Letter Exchange arguments), RabbitMQ will drop the channel with code `406 PRECONDITION_FAILED`.
