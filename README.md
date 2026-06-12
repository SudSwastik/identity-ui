# IdentityUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.26.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## UI Integration Flow

The Angular frontend (`identity-ui`, port `4200`) integrates with this backend (port `8080`) directly in development. No proxy — ensure the backend allows CORS from `http://localhost:4200`.

### Backend CORS requirement

```java
// SecurityConfig.java
configuration.setAllowedOrigins(List.of("http://localhost:4200"));
```

### Routes and Endpoint Mapping

| UI Route                    | Backend Endpoint                     | Phase  | Status    |
|-----------------------------|--------------------------------------|--------|-----------|
| `/auth/login`               | `POST /api/auth/login`               | 1      | ✅ Built  |
| `/auth/register`            | `POST /api/auth/register`            | 2      | stub      |
| `/auth/verify-email`        | `POST /api/auth/verify-email`        | 3      | stub      |
| `/auth/resend-verification` | `POST /api/auth/resend-verification` | 4      | stub      |
| `/auth/forgot-password`     | `POST /api/auth/forgot-password`     | future | —         |
| `/auth/reset-password`      | `POST /api/auth/reset-password`      | future | —         |
| `/auth/mfa`                 | `POST /api/auth/mfa-challenge`       | future | —         |

### Auth Flow Sequence

```
Register (/auth/register)
  → POST /api/auth/register { email, password, name }
  → on success: redirect to /auth/verify-email?email=<email>

Verify Email (/auth/verify-email?email=<email>)
  → POST /api/auth/verify-email { email, code }
  → on success: redirect to /auth/login?verified=true

Login (/auth/login)
  → POST /api/auth/login { email, password }
  → no MFA:  save tokens to localStorage → redirect to /dashboard
  → MFA:     { challengeName, session } → redirect to /auth/mfa (future)

Resend Code (/auth/resend-verification?email=<email>)
  → POST /api/auth/resend-verification { email }
  → stays on page, shows inline confirmation
```

### Token Storage

After successful login, tokens are stored in `localStorage`:

| Key             | Value                                       |
|-----------------|---------------------------------------------|
| `access_token`  | Used as `Authorization: Bearer <token>`     |
| `refresh_token` | For future token refresh flow               |
| `id_token`      | Contains Cognito claims (name, email, sub)  |

### Error Format

The backend returns [RFC 9457 Problem Detail](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`). The UI reads `error.detail` → `error.title` → fallback message.

### Phase Testing Checklist

**Phase 1 — Login**
- [ ] Start backend: `mvn spring-boot:run -Dspring-boot.run.profiles=local`
- [ ] Start frontend: `npm start`
- [ ] Navigate to `http://localhost:4200` → redirects to `/auth/login`
- [ ] Submit empty form → validation errors appear
- [ ] Submit valid credentials → tokens saved to localStorage, redirect to `/dashboard`
- [ ] Submit wrong credentials → error banner shows backend `detail` message





# Identity Service

A production-grade identity and access management service built with Spring Boot, AWS Cognito, and PostgreSQL.

## Architecture

Authentication is fully delegated to **AWS Cognito** (registration, login, token issuance, MFA). All authorization — roles, permissions, RBAC — lives exclusively in **PostgreSQL**, linked to Cognito users via the `sub` claim (UUID). Cognito groups are intentionally ignored; PostgreSQL is the single source of truth for access control. Spring Security validates JWTs automatically using Cognito's JWKS endpoint — no manual key management.

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT                                   │
│                  (Browser / Mobile / API Consumer)                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
              Authorization: Bearer <Cognito JWT>
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       IDENTITY SERVICE                              │
│                        (Spring Boot 3.3)                            │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐    │
│  │  SecurityConfig │    │         JwtAuthenticationConverter   │    │
│  │                 │    │                                      │    │
│  │  - Stateless    │───▶│  1. Extract sub claim                │    │
│  │  - JWKS cached  │    │  2. Query PostgreSQL user_roles      │    │
│  │  - Public:      │    │  3. Merge into GrantedAuthority set  │    │
│  │    /api/auth/** │    └──────────────────────────────────────┘    │
│  └─────────────────┘                                                │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │ AuthController│  │ MfaController │  │ RolesController        │   │
│  │               │  │               │  │ UsersController        │   │
│  │ /api/auth/**  │  │ /api/mfa/**   │  │ /api/roles/**          │   │
│  │               │  │               │  │ /api/users/**          │   │
│  └───────┬───────┘  └───────┬───────┘  └───────────┬────────────┘   │
│          │                  │                       │               │
│          ▼                  ▼                       ▼               │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │  AuthService  │  │  MfaService   │  │ RoleService            │   │
│  │               │  │               │  │ UserRoleService        │   │
│  └───────┬───────┘  └───────┬───────┘  └───────────┬────────────┘   │
│          │                  │                      │               │
└──────────┼──────────────────┼──────────────────────┼──────────────┘
           │                  │                      │
           ▼                  ▼                      ▼
┌─────────────────────┐              ┌──────────────────────────────┐
│    AWS Cognito      │             │        PostgreSQL             │
│                     │              │                               │
│  - User Pool        │              │  roles                        │
│  - Token issuance   │              │  permissions                  │
│  - MFA (TOTP)       │              │  role_permissions             │
│  - Password reset   │              │  user_roles (keyed by sub)    │
│  - Email verify     │              │                               │
└─────────────────────┘              └──────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│    Email (SMTP)     │
│                     │
│  Local: Mailhog     │
│  Dev/Prod: AWS SES  │
└─────────────────────┘
```

## Request Auth Flow

```
Client Request (Bearer token)
         │
         ▼
Spring Security ──▶ Fetch/Cache Cognito JWKS ──▶ Validate JWT signature + expiry
         │
         ▼
JwtAuthenticationConverter (PostgreSQL-backed)
  ├── Extract sub claim (Cognito user UUID)
  └── UserRoleService.getAuthoritiesForUser(sub)
        ├── ROLE_<name> for each assigned role
        └── <resource>:<action> for each permission in those roles
      (cognito:groups intentionally ignored — PostgreSQL is authoritative)
         │
         ▼
Merged GrantedAuthority set on SecurityContextHolder
         │
         ▼
Controller Method (@PreAuthorize / hasAuthority checks)
```

## MFA Setup Flow

```
POST /api/mfa/setup  (Bearer required)
  └── Cognito AssociateSoftwareToken
        └── Returns { secretCode, qrCodeUri }
              qrCodeUri = otpauth://totp/<appName>:<username>?secret=...
              (render as QR code — compatible with Google Authenticator / Authy)

User scans QR code and enters the 6-digit TOTP code

POST /api/mfa/verify-setup  { userCode: "123456" }
  └── Cognito VerifySoftwareToken (validates the code)
        └── AdminSetUserMFAPreference (enables TOTP as preferred MFA)
              └── MFA active — login flow now returns a SOFTWARE_TOKEN_MFA challenge
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Schema                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────┐
│          roles            │       │       permissions         │
├──────────────────────────┤       ├──────────────────────────┤
│ id          BIGSERIAL     │       │ id          BIGSERIAL     │
│ version     BIGINT        │       │ version     BIGINT        │
│ name        VARCHAR(100)  │       │ resource    VARCHAR(100)  │
│ description VARCHAR(255)  │       │ action      VARCHAR(50)   │
│ created_at  TSTZ          │       │ created_at  TSTZ          │
│ created_by  VARCHAR(255)  │       │ created_by  VARCHAR(255)  │
│ modified_at TSTZ          │       │ modified_at TSTZ          │
│ modified_by VARCHAR(255)  │       │ modified_by VARCHAR(255)  │
└────────────┬──────────────┘       └────────────┬─────────────┘
             │                                   │
             └──────────────┬────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────┐
              │       role_permissions        │
              ├──────────────────────────────┤
              │ role_id       BIGINT ─────────┼──▶ roles.id
              │ permission_id BIGINT ─────────┼──▶ permissions.id
              │ assigned_at   TIMESTAMPTZ     │
              │ assigned_by   VARCHAR(255)    │
              │ PRIMARY KEY (role_id,         │
              │              permission_id)   │
              └──────────────────────────────┘

┌───────────────────────────────────┐
│             user_roles             │
├───────────────────────────────────┤
│ cognito_sub VARCHAR(255) NOT NULL  │  ◀── JWT sub claim (Cognito UUID)
│ role_id     BIGINT ───────────────┼──▶ roles.id
│ assigned_at TIMESTAMPTZ           │
│ assigned_by VARCHAR(255)          │  ◀── sub of admin who assigned
│ PRIMARY KEY (cognito_sub, role_id) │
└───────────────────────────────────┘

┌──────────────────────────────────────┐
│              audit_logs               │
├──────────────────────────────────────┤
│ id          UUID (gen_random_uuid())  │
│ entity_type VARCHAR(100)             │  e.g. "Role", "Permission"
│ entity_id   VARCHAR(255)             │  stringified PK
│ action      VARCHAR(50)              │  CREATE / UPDATE / DELETE / ASSIGN
│ actor_sub   VARCHAR(255)             │  Cognito sub of who did it
│ old_value   JSONB                    │  state before change
│ new_value   JSONB                    │  state after change
│ created_at  TIMESTAMPTZ              │
└──────────────────────────────────────┘

INDEXES:
  idx_user_roles_cognito_sub  ON user_roles  (cognito_sub)
  idx_audit_logs_entity       ON audit_logs  (entity_type, entity_id)
  idx_audit_logs_actor        ON audit_logs  (actor_sub)
  idx_audit_logs_created_at   ON audit_logs  (created_at DESC)
```

### Permission Identity

Permissions have no `name` column. Identity is `(resource, action)` with a `UNIQUE` constraint — e.g. `resource=users, action=read`. The application generates the display label as `resource:action` via `Permission.toPermissionString()`.

### Audit Fields

`roles` and `permissions` extend the `Auditable` base class. Fields are populated automatically by Spring Data JPA auditing; the auditor is the JWT `sub` of the authenticated user, or `"system"` for unauthenticated operations (Flyway seed, scheduled jobs).

| Column | Type | Set on | Description |
|--------|------|--------|-------------|
| `created_at` | TIMESTAMPTZ | INSERT | Timestamp of creation |
| `created_by` | VARCHAR | INSERT | Cognito `sub` of creator |
| `modified_at` | TIMESTAMPTZ | INSERT + UPDATE | Timestamp of last change |
| `modified_by` | VARCHAR | INSERT + UPDATE | Cognito `sub` of last modifier |
| `version` | BIGINT | Every UPDATE | Optimistic lock counter — prevents silent lost updates |

`role_permissions` and `user_roles` use `assigned_at` / `assigned_by` — these records are never updated, only created or deleted.

### Audit Log

`audit_logs` is append-only. It captures the full before/after state as JSONB, the entity type and ID, and the actor's Cognito `sub`. It answers questions like "who removed ADMIN from user X?" or "what did permission Y look like before it was changed?" that the inline audit columns cannot.

### Seed Data

| Role | Permissions |
|------|------------|
| ADMIN | users:read, users:write, users:delete, roles:read, roles:write, roles:delete, permissions:read, permissions:write |
| USER | users:read |
| READONLY | users:read, roles:read, permissions:read |

## API Reference

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Create Cognito user |
| POST | `/login` | Public | Authenticate, returns JWT tokens |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Bearer | Revoke tokens (global sign-out) |
| POST | `/forgot-password` | Public | Trigger reset email |
| POST | `/reset-password` | Public | Confirm new password with code |
| POST | `/verify-email` | Public | Confirm email with Cognito code |
| POST | `/resend-verification` | Public | Resend verification code |
| POST | `/mfa-challenge` | Public | Complete MFA challenge after login (returns tokens) |

### MFA — `/api/mfa`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/setup` | Bearer | Enable TOTP — returns secret + QR URI |
| POST | `/verify-setup` | Bearer | Confirm TOTP code to activate MFA |
| DELETE | `/disable` | Bearer | Disable MFA |
| GET | `/status` | Bearer | Check if MFA is enabled |

### Roles — `/api/roles` (Admin only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ADMIN | List all roles |
| POST | `/` | ADMIN | Create role — returns `201 Created` |
| PUT | `/{id}` | ADMIN | Update role name/description |
| DELETE | `/{id}` | ADMIN | Delete role — returns `204 No Content` |
| POST | `/{id}/permissions` | ADMIN | Assign permissions to role (idempotent) |
| DELETE | `/{id}/permissions/{permissionId}` | ADMIN | Revoke a single permission from role |
| POST | `/assign` | ADMIN | Assign role to user (by sub) |
| DELETE | `/revoke` | ADMIN | Revoke role from user |

### Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Bearer | Current user profile + roles (Cognito + PostgreSQL) |
| PUT | `/me` | Bearer | Update Cognito `name` attribute |
| GET | `/{sub}` | ADMIN | Get any user by Cognito sub |
| POST | `/{sub}/disable` | ADMIN | Disable user (Cognito AdminDisableUser — reversible) |
| POST | `/{sub}/enable` | ADMIN | Re-enable a disabled user |

### Error Responses

All errors use [RFC 9457 Problem Detail](https://www.rfc-editor.org/rfc/rfc9457) format (`application/problem+json`):

| Status | Trigger |
|--------|---------|
| `400` | `AuthException` — Cognito rejected the request |
| `404` | `ResourceNotFoundException` — role, permission, or user not found |
| `409` | `ConflictException` or optimistic lock failure |
| `422` | Validation failure (`@Valid` / `@NotBlank` / `@Pattern` etc.) |

## Local Development

### Prerequisites

- Java 21
- Docker + Docker Compose
- Maven 3.9+

### Option A — Maven (fastest for development)

```bash
# Start Postgres + Mailhog only
docker-compose -f docker/docker-compose.local.yml up postgres mailhog -d

# Run with local profile (Flyway migrations run automatically)
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Mailhog web UI (catches all outbound email): http://localhost:8025

### Option B — Full Docker Compose (all services including app)

```bash
# Copy and fill in env vars
cp docker/.env.example docker/.env

# Start everything
docker-compose -f docker/docker-compose.local.yml up --build
```

### Build

```bash
mvn clean package -DskipTests
```

### Docker image

```bash
# Build image
docker build -t identity-service:latest .

# Run (requires env vars)
docker run -p 8080:8080 --env-file docker/.env identity-service:latest
```

### Test

```bash
# All tests
mvn test

# Single test class
mvn test -Dtest=RoleServiceTest

# Single test method
mvn test -Dtest=RoleServiceTest#shouldAssignRole
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COGNITO_ISSUER_URI` | dev/prod | `https://cognito-idp.<region>.amazonaws.com/<pool-id>` |
| `COGNITO_JWKS_URI` | dev/prod | Cognito JWKS endpoint |
| `COGNITO_USER_POOL_ID` | dev/prod | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | dev/prod | Cognito App Client ID |
| `COGNITO_CLIENT_SECRET` | optional | App client secret — omit if client has no secret |
| `SPRING_DATASOURCE_URL` | dev/prod | `jdbc:postgresql://<host>:5432/identity_service` |
| `SPRING_DATASOURCE_USERNAME` | dev/prod | DB username |
| `SPRING_DATASOURCE_PASSWORD` | dev/prod | DB password |
| `AWS_REGION` | dev/prod | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | dev/prod | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | dev/prod | IAM secret key |
| `SES_SMTP_HOST` | dev/prod | SES SMTP endpoint |
| `SES_USERNAME` | dev/prod | SES SMTP username |
| `SES_PASSWORD` | dev/prod | SES SMTP password |

## Profiles

| Profile | DB | Email | Log Level |
|---------|-----|-------|-----------|
| `local` | `localhost:5432` | Mailhog `:1025` | DEBUG |
| `dev` | RDS (env var) | AWS SES | INFO |
| `prod` | RDS (env var) | AWS SES | WARN |

## Infrastructure (Terraform)

### Usage

```bash
cd terraform/environments/dev

# Copy and fill in your values
cp terraform.tfvars.example terraform.tfvars

terraform init
terraform plan -var-file="terraform.tfvars" -var="db_password=$DB_PASSWORD"
terraform apply -var-file="terraform.tfvars" -var="db_password=$DB_PASSWORD"
```

> Pass sensitive values (`db_password`) via env var `TF_VAR_db_password` or `-var` flag — never commit them to `terraform.tfvars`.

### Modules

| Module | Resources |
|--------|-----------|
| `modules/cognito` | User Pool (email/password + TOTP MFA), App Client (server-side auth), 3 groups (ADMIN/USER/READONLY) |
| `modules/ses` | Domain identity, DKIM, IAM user + SMTP credentials for JavaMailSender |
| `modules/rds` | PostgreSQL 16 on RDS, subnet group, security group (locked to app SG) |

### First-time DNS steps (after `terraform apply`)

Terraform outputs the DNS records you need to add:

```bash
# Verify SES domain ownership
terraform output ses_dns_verification_token   # → add as TXT _amazonses.<domain>

# Enable DKIM signing
terraform output ses_dkim_tokens              # → add 3 CNAME <token>._domainkey.<domain>
```

### Retrieve app credentials

```bash
# All values needed for docker/.env or ECS task definition
terraform output cognito_issuer_uri
terraform output cognito_jwks_uri
terraform output cognito_user_pool_id
terraform output cognito_client_id
terraform output -json cognito_client_secret   # sensitive
terraform output rds_jdbc_url
terraform output ses_smtp_username
terraform output -json ses_smtp_password       # sensitive
```


### Dev vs Prod differences

| Setting | Dev | Prod |
|---------|-----|------|
| RDS instance | `db.t3.micro` | `db.t3.small` (configurable) |
| Storage | 20 GB | 50 GB (configurable) |
| Multi-AZ | No | Yes |
| Deletion protection | Off | On |
| Final snapshot | No | Yes |
