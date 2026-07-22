# CampusServ — Account Lifecycle Reference (Single-Role Enforced)

**Version:** 3.1 Single-Role Enforced Baseline  
**Date:** July 22, 2026  
**Repository:** `c:\Users\allen\Desktop\CampuServ`

---

## 1. Single-Role-Per-Account Rule

Every CampusServ user account has **exactly one permanent role** (`role`: `STUDENT`, `PROVIDER`, or `ADMIN`), established at registration.
- Dual-role account capability (`primary_role`, `secondary_role`, `secondary_role_status`, `active_role_view`) has been completely removed.
- Students cannot upgrade an existing student account to become a provider on the same account. Users who wish to operate as both a student requester and a service provider must register separate accounts with different email addresses.

---

## 2. Registration Paths

Accounts on CampusServ are created via the authentication endpoint handled by `auth-service`.

### A. Student Client Signup
- **UI Screen:** `ClientSignUpScreen.tsx`
- **Endpoint:** `POST /auth/register` (routed via API Gateway `8080` -> `auth-service` `8087`)
- **Payload:** `{ email, password, fullName, role: 'STUDENT' }`
- **Database Fields Written (`users` table):**
  - `id`: UUID (Generated)
  - `email`: Student KNUST email
  - `password_hash`: BCrypt encoded string
  - `full_name`: User's full name
  - `role`: `"STUDENT"`
  - `primary_role_verified`: `TRUE` (Student role requires no manual ID approval)
  - `email_verified`: `FALSE`
  - `is_verified`: `FALSE` (Pending email verification)
  - `account_status`: `"PENDING_VERIFICATION"`
  - `created_at` / `updated_at`: `NOW()`

### B. Service Provider Signup
- **UI Screen:** `ProviderSignUpScreen.tsx`
- **Endpoint:** `POST /auth/register`
- **Payload:** `{ email, password, fullName, role: 'PROVIDER' }`
- **Database Fields Written (`users` table):**
  - `id`: UUID
  - `email`: Student KNUST email
  - `password_hash`: BCrypt encoded string
  - `full_name`: User's full name
  - `role`: `"PROVIDER"`
  - `primary_role_verified`: `FALSE` (Requires Student ID card photo upload and admin verification)
  - `email_verified`: `FALSE`
  - `is_verified`: `FALSE`
  - `account_status`: `"PENDING_VERIFICATION"`

### Validation Enforcement
- **Email Domain Validation:** Must end with `@st.knust.edu.gh` or `@knust.edu.gh`. Enforced on client (`ClientSignUpScreen.tsx`) and validated in `AuthService.java` (`validateKnustEmail`). Direct API bypass attempts are blocked with HTTP `400 Bad Request`.
- **Password Complexity:** Minimum 6 characters, hashed with BCrypt.
- **Uniqueness Check:** `AuthService.java` checks `userRepository.existsByEmail(...)` and database `UNIQUE` constraint on `users.email`.

---

## 3. Verification & Approval Flow

```
[ Signup ] ──► [ Email Sent ] ──► [ Click Verification Link ] ──► [ email_verified = true ]
                                                                             │
                      ┌──────────────────────────────────────────────────────┴──────────────────────────────────┐
                      ▼                                                                                         ▼
          (If Role = STUDENT)                                                                        (If Role = PROVIDER)
                      │                                                                                         │
                      ▼                                                                                         ▼
         [ account_status = ACTIVE ]                                                                 [ Upload Student ID Photo ]
         [  is_verified = true    ]                                                                             │
                      │                                                                                         ▼
                      ▼                                                                             [ Admin Review Queue ]
         [ Full App Access Granted ]                                                                            │
                                                                             ┌──────────────────────────────────┴──────────────────────────────────┐
                                                                             ▼                                                                     ▼
                                                                     (Admin Approved)                                                      (Admin Rejected)
                                                                             │                                                                     │
                                                                             ▼                                                                     ▼
                                                                 [ primary_role_verified = true  ]                                     [ primary_role_verified = false ]
                                                                 [ account_status = ACTIVE       ]                                     [ rejection_reason set in DB    ]
                                                                 [ is_verified = true            ]                                                                │
                                                                             │                                                                     ▼
                                                                             ▼                                                         [ RejectedApplicationScreen ]
                                                                 [ Provider Access Granted ]                                           [ Resubmit ID Photo Allowed ]
```

### Rejection & Resubmission Handling
- When rejected, admin provides a written `rejection_reason`.
- Mobile client routes user to `RejectedApplicationScreen.tsx`, displaying `user.rejectionReason`.
- User can re-upload their Student ID photo directly without re-registering or re-verifying email.

---

## 4. Account States & Access Control Matrix

| `account_status` | `is_verified` | Allowed Capabilities | Mobile App Router Behavior (`AppNavigator.tsx`) |
|---|---|---|---|
| `PENDING_VERIFICATION` | `false` | Email verification & ID photo upload only | Routed to `VerifyEmailScreen` or `IdCaptureScreen` / `PendingApprovalScreen` |
| `ACTIVE` | `true` | Full platform capabilities matching user's single role | Routed to `AppTabs` (STUDENT) or `ProviderNavigator` (PROVIDER) |
| `SUSPENDED` | `false` | All platform features blocked due to temporary penalty | Routed to `AccountRestrictedScreen` |
| `BANNED` | `false` | Permanent ban. All features blocked. | Routed to `AccountRestrictedScreen` |

---

## 5. Authentication & Session Management

- **Login:** `POST /auth/login` returns JWT Access Token (15-min TTL) + Refresh Token (7-day TTL). `role` claim in JWT contains single `user.role`.
- **Session Rotation:** `POST /auth/refresh` rotates refresh tokens and revokes old tokens.
- **Logout:** Clears client SecureStore AND calls `POST /auth/logout` to revoke tokens on server.
- **Token Revocation Deny-List:** `JwtValidationGatewayFilterFactory` persists revoked user IDs to Redis (`revoked:user:{userId}`) with a 15-minute TTL.

---

## 6. Admin Account Management Capabilities

- **Approve Provider Application:** `POST /admin/verification/{userId}/approve`
- **Reject Provider Application:** `POST /admin/verification/{userId}/reject` (requires `reason`)
- **Suspend Account:** `PUT /admin/users/{userId}/suspend`
- **Ban Account:** `PUT /admin/users/{userId}/ban`
- **Reactivate Account:** `PUT /admin/users/{userId}/activate`
- **Account Deletion Removal:** Self-service account deletion is completely removed across mobile, backend controllers, and RabbitMQ message broker queues (`user.deleted` queue removed).

---

## 7. Email Verification Removal

Email verification features, tokens, Brevo email services, and verification magic links have been **completely and permanently removed** from CampusServ:

- **Instant Active Registrations**: Student registrations with valid `@st.knust.edu.gh` or `@knust.edu.gh` email addresses become `ACTIVE` and `is_verified = true` immediately upon account creation.
- **Provider ID Verification Preserved**: Provider accounts still undergo Student ID card upload & admin approval queue before being granted active provider access (`primaryRoleVerified = true`).
- **Removed Artifacts**: `BrevoEmailService.java`, `EmailVerificationToken.java`, `EmailVerificationTokenRepository.java`, `VerifyEmailScreen.tsx`, and the `email_verification_tokens` database table have been deleted.


