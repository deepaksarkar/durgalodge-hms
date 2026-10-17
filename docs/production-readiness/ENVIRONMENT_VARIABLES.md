# Environment Variables Inventory — Durga Lodge HMS

This inventory documents all environment variables referenced in the source code, build scripts, Prisma configuration, and Docker definitions of the Durga Lodge Hotel Management System.

---

## 📋 Comprehensive Variable Inventory Table

| Variable Name | Purpose | Required / Optional | Contains Secret? | Safe for Browser? | Local Dev Location | Production Location | Source Code References |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI for Prisma ORM and node-pg pool | **Required** | **YES** (DB user password) | ❌ **NO (Never)** | `.env` | Host Provider Dashboard / Docker Env | `prisma.config.ts`, `src/lib/db.ts`, `scripts/seed.js`, `scripts/sync-db.js`, `tests/integration/booking-lifecycle.test.js` |
| `AUTH_SECRET` | Cryptographic key used to sign and verify session JWTs (HS256) | **Required** | **YES** (Signing Key) | ❌ **NO (Never)** | `.env` | Host Provider Dashboard / Docker Env | `src/lib/session.ts` |
| `NODE_ENV` | Sets runtime environment (`production` vs `development`) | **Required** (Defaults to `production` in build) | No | ❌ Server-side | `.env` or automatic | Host Environment Settings / Dockerfile | `src/lib/session.ts`, `src/lib/db.ts`, `Dockerfile`, `docker-compose.yml` |
| `HOTEL_TIMEZONE` | IANA Timezone for hotel operations and night calculation | Optional (Defaults to `Asia/Kolkata`) | No | ❌ Server-side | `.env` | Host Provider Dashboard / Docker Env | `src/lib/date-utils.ts`, `src/lib/kolkata-time.ts`, `docker-compose.yml` |
| `CURRENCY` | Currency code for reporting and display formatting | Optional (Defaults to `INR`) | No | ❌ Server-side | `.env` | Host Provider Dashboard / Docker Env | `docker-compose.yml`, `.env.example` |
| `STORAGE_PATH` | Local filesystem path for storing uploaded expense receipts | Optional (Defaults to `./public/uploads/receipts`) | No | ❌ Server-side | `.env` | Host Provider Dashboard / Docker Env / Volume | `src/lib/storage.ts`, `docker-compose.yml` |
| `STORAGE_PROVIDER` | Defines receipt storage strategy (`local` vs future S3) | Optional (Defaults to `local`) | No | ❌ Server-side | `.env` | Host Provider Dashboard / Docker Env | `.env.example` |
| `APP_URL` | Canonical public URL of the application | Optional (Defaults to `http://localhost:3000`) | No | ❌ Server-side | `.env` | Host Provider Dashboard / Docker Env | `.env.example` |
| `POSTGRES_USER` | PostgreSQL superuser/app username for local Docker container | Optional (Docker only) | No | ❌ Server-side | `.env` / `docker-compose.yml` | N/A (Handled by Hosted DB provider) | `docker-compose.yml`, `.env.example` |
| `POSTGRES_PASSWORD` | PostgreSQL password for local Docker container | Optional (Docker only) | **YES** | ❌ **NO (Never)** | `.env` / `docker-compose.yml` | N/A (Handled by Hosted DB provider) | `docker-compose.yml`, `.env.example` |
| `POSTGRES_DB` | Initial database name for local Docker container | Optional (Docker only) | No | ❌ Server-side | `.env` / `docker-compose.yml` | N/A (Handled by Hosted DB provider) | `docker-compose.yml`, `.env.example` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel authentication token for Cloudflare Zero Trust | Optional (Tunnel profile only) | **YES** (Tunnel Token) | ❌ **NO (Never)** | `.env` | Docker Compose / Tunnel Host | `docker-compose.yml`, `.env.example` |
| `PORT` | HTTP port the Next.js production server listens on | Optional (Defaults to `3000`) | No | ❌ Server-side | Shell / Docker | Cloud Host Settings / Dockerfile | `Dockerfile` |

---

## 🔍 Detailed Variable Specifications

### 1. `DATABASE_URL`
- **Purpose**: Establishes the PostgreSQL database connection for Prisma Client 7, Prisma CLI migrations, and the native `node-pg` (`pg.Pool`) database connection pool.
- **Required**: **Yes**. Application cannot boot or run migrations without it.
- **Contains Secret**: **Yes**. Encodes database credentials in the connection URI.
- **Safe for Browser**: **Never**. Exposing this grants full database read/write access.
- **How to Obtain / Generate**:
  - *Local Development*: Format `postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public&sslmode=disable`
  - *Hosted Production (Neon, Supabase, AWS RDS, Render, Railway)*: Copy the PostgreSQL connection URI from your cloud database provider's management console. Must include `?sslmode=require`.
- **Configuration Location**:
  - *Local*: `.env`
  - *Production*: Cloud hosting environment variables tab (e.g. Render Environment Variables, Railway Variables, Vercel Environment Variables).

---

### 2. `AUTH_SECRET`
- **Purpose**: Symmetric encryption and signature key used by `jose` (`SignJWT`, `jwtVerify`) to cryptographically sign session tokens stored in HTTP-only cookies (`session`).
- **Required**: **Yes**.
- **Contains Secret**: **Yes**. Knowledge of this key allows an attacker to forge session cookies for any user ID and role (including `ADMIN`).
- **Safe for Browser**: **Never**.
- **How to Obtain / Generate**:
  - Generate a cryptographically secure 256-bit random string (at least 32 characters) using OpenSSL or Node.js crypto:
    ```bash
    # OpenSSL (Linux / macOS / Git Bash):
    openssl rand -base64 32

    # Node.js (Windows PowerShell / Cross-Platform):
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    ```
- **Configuration Location**:
  - *Local*: `.env`
  - *Production*: Cloud hosting environment variables tab. Must **differ** from development.

---

### 3. `NODE_ENV`
- **Purpose**: Controls Next.js runtime optimizations, error message masking, and cookie security flags (`secure: process.env.NODE_ENV === 'production'`).
- **Required**: **Yes** in production (sets `secure` flag on HTTPS cookies).
- **Contains Secret**: No.
- **Safe for Browser**: Safe to read build mode, but not exposed via `NEXT_PUBLIC_`.
- **Value**: Set to `production` in production, `development` locally.

---

### 4. `HOTEL_TIMEZONE`
- **Purpose**: Defines the operational timezone for Durga Lodge HMS (Puri, Odisha). Used for calculating checkout cutoffs, daily closing business dates, stay night duration, and fallback system timestamps.
- **Required**: Optional. Defaults to `Asia/Kolkata` if omitted.
- **Contains Secret**: No.
- **Safe for Browser**: Safe.
- **Value**: Standard IANA timezone string: `Asia/Kolkata`.

---

### 5. `CURRENCY`
- **Purpose**: Identifies the base currency code for financial reporting and invoicing.
- **Required**: Optional. Defaults to `INR` if omitted.
- **Contains Secret**: No.
- **Safe for Browser**: Safe.
- **Value**: `INR`.

---

### 6. `STORAGE_PATH`
- **Purpose**: Filesystem directory where uploaded receipt files (JPEG, PNG, WebP, PDF) from expense records are written.
- **Required**: Optional. Defaults to `./public/uploads/receipts`.
- **Contains Secret**: No.
- **Safe for Browser**: Safe (represents server directory path).
- **Production Note**: On containerized hosts, mount a persistent volume to this path. On serverless hosts (Vercel), local disk writes are ephemeral/read-only; an S3/R2 object storage adapter should be used if deploying to serverless platforms.

---

### 7. `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **Purpose**: Used exclusively by local Docker Compose (`docker-compose.yml`) to initialize the local PostgreSQL container.
- **Required**: Only when running database via local Docker Compose.
- **Contains Secret**: `POSTGRES_PASSWORD` is a secret.
- **Production Note**: Not needed when connecting to an external hosted database (Neon, Supabase, Render Postgres).

---

### 8. `CLOUDFLARE_TUNNEL_TOKEN`
- **Purpose**: Connects the local Docker stack directly to Cloudflare Zero Trust via `cloudflared` without opening inbound router ports.
- **Required**: Optional. Only used when running `docker compose --profile tunnel up`.
- **Contains Secret**: **Yes**.
- **Safe for Browser**: **Never**.
- **How to Obtain**: Cloudflare Zero Trust Dashboard → Networks → Tunnels.

---

## 🔒 Client-Side (`NEXT_PUBLIC_`) Audit

A full codebase search was performed across all `.ts`, `.tsx`, `.js`, and `.mjs` files:
- **Zero** variables with the prefix `NEXT_PUBLIC_` exist in the repository.
- No database credentials, secret keys, or internal configurations are bundled into client-side browser JavaScript.
