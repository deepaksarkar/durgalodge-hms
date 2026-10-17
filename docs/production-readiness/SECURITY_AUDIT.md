# Comprehensive Security Audit Report — Durga Lodge HMS

**Date**: 2026-10-10  
**Application**: Durga Lodge Hotel Management System (HMS)  
**Stack**: Next.js 16.4.0 (App Router), React 19, Prisma 7.10.0, PostgreSQL 15, Argon2, Jose (JWT)  
**Auditor**: Senior Full-Stack & Security Engineering Review  

---

## Executive Summary

A thorough architectural and implementation security audit of the Durga Lodge HMS codebase was performed prior to public deployment. The application features strong foundational primitives—including **Argon2** password hashing, **HTTP-only SameSite=Lax** session cookies, parameterized SQL queries via **Prisma ORM**, and exact integer **paise arithmetic** preventing floating-point currency drift.

However, several **Critical** and **High-severity** authorization and configuration vulnerabilities were identified that **must be addressed before deploying the application to the public internet**. Most notably, several Next.js Server Actions lack session verification (allowing unauthenticated data retrieval over RPC), session tokens lack a real-time revocation check against the database, and `AUTH_SECRET` lacks a startup validation assertion.

---

## Findings Overview Matrix

| ID | Title | Severity | Status | Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Unauthenticated Server Action Endpoints Exposing Financials & PII | 🔴 **CRITICAL** | Needs Remediation | `report-actions.ts`, `guest-actions.ts`, `room-actions.ts`, `booking-actions.ts`, `daily-closing-actions.ts` |
| **SEC-02** | Silent Default Fallback in JWT Secret Signing Key | 🔴 **CRITICAL** | Needs Remediation | `src/lib/session.ts` |
| **SEC-03** | Publicly Documented Default Seed Credentials in Production | 🔴 **CRITICAL** | Needs Operational Action | `scripts/seed.js`, `README.md` |
| **SEC-04** | Stateless JWT Verification Lacks Account Revocation Check | 🟠 **HIGH** | Needs Remediation | `src/lib/session.ts`, `src/lib/auth.ts` |
| **SEC-05** | Broken Access Control on Financial & Reporting Page Views | 🟠 **HIGH** | Needs Remediation | `src/app/(dashboard)/reports/page.tsx`, `revenue/page.tsx`, `daily-closing/page.tsx`, `expenses/page.tsx` |
| **SEC-06** | Hardcoded Fallback Database Connection String | 🟠 **HIGH** | Needs Remediation | `src/lib/db.ts`, `scripts/seed.js` |
| **SEC-07** | Missing Rate Limiting and Account Lockout on Login | 🟡 **MEDIUM** | Needs Remediation | `src/server/actions/auth-actions.ts` |
| **SEC-08** | File Upload Extension Discrepancy & Ephemeral Storage | 🟡 **MEDIUM** | Needs Remediation | `src/lib/storage.ts` |
| **SEC-09** | Backup & Restore Scripts Incompatible with Hosted Databases | 🟡 **MEDIUM** | Needs Remediation | `scripts/backup.sh`, `backup.ps1`, `restore.sh`, `restore.ps1` |
| **SEC-10** | Missing HTTP Security Headers | 🔵 **LOW** | Needs Configuration | `next.config.ts` |
| **SEC-11** | Deprecated Next.js Middleware Convention | 🔵 **LOW** | Informational | `src/middleware.ts` |
| **SEC-12** | SQL Injection Immunity via Parameterized Prisma Queries | 🟢 **INFO** | Verified Secure | All Prisma Models |
| **SEC-13** | Time API Network Timeout and System Fallback Resilience | 🟢 **INFO** | Verified Secure | `src/lib/kolkata-time.ts` |

---

## Detailed Vulnerability Findings

### 🔴 SEC-01: Unauthenticated Server Action Endpoints Exposing Financials & PII (CRITICAL)

#### Description
In Next.js, every function exported from a file containing `'use server'` is compiled into a public HTTP POST RPC endpoint accessible by any external client via action headers. If a server action does not check `getSession()` or `requireAuth()`, anyone can invoke it directly over the network without logging in.

#### Impact
The following actions execute Prisma queries without verifying authentication:
1. `getRevenueReport()`, `getExpenseReport()`, `getProfitAndLossReport()`, `getOccupancyReport()`, `getOutstandingPaymentsReport()`, `getRoomPerformanceReport()` in `src/server/actions/report-actions.ts`: **Exposes entire hotel financial records, profit/loss, daily revenues, and expense details.**
2. `getGuests()`, `getGuestProfile()` in `src/server/actions/guest-actions.ts`: **Exposes customer Personally Identifiable Information (PII) including full names, phone numbers, addresses, Aadhaar/ID numbers, stay history, and lifetime spending.**
3. `getRoomsWithStatus()`, `getRoomDetails()` in `src/server/actions/room-actions.ts`: **Exposes currently occupied rooms and active guest identities.**
4. `getBookings()`, `getBookingById()` in `src/server/actions/booking-actions.ts`: **Exposes booking folios and payment transactions.**
5. `getDailyClosingSummary()` in `src/server/actions/daily-closing-actions.ts`: **Exposes daily register balances and cash counts.**
6. `getExpenses()`, `getExpenseCategories()` in `src/server/actions/expense-actions.ts`: **Exposes vendor payments, receipts, and internal expense vouchers.**

#### Remediation
Add session authentication to all read actions. Example:
```typescript
import { requireAuth, requirePermission } from '@/lib/auth'

export async function getRevenueReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  // ... execute query
}
```

---

### 🔴 SEC-02: Silent Default Fallback in JWT Secret Signing Key (CRITICAL)

#### Description
In `src/lib/session.ts`:
```typescript
const secretKey = process.env.AUTH_SECRET
const key = new TextEncoder().encode(secretKey)
```
If `process.env.AUTH_SECRET` is unset or empty in production, `new TextEncoder().encode(undefined)` encodes the 9-byte string `"undefined"`. The application boots without error and signs JWT tokens with the literal string `"undefined"`.

#### Impact
An attacker who observes that `AUTH_SECRET` is missing can trivially forge valid session tokens for any `userId` with role `ADMIN`, bypassing all authentication controls.

#### Remediation
Enforce an immediate validation assertion on startup:
```typescript
const secretKey = process.env.AUTH_SECRET
if (!secretKey || secretKey.length < 32) {
  throw new Error('FATAL SECURITY ERROR: AUTH_SECRET must be set and contain at least 32 characters.')
}
const key = new TextEncoder().encode(secretKey)
```

---

### 🔴 SEC-03: Publicly Documented Default Seed Credentials in Production (CRITICAL)

#### Description
The database seed script (`scripts/seed.js`) seeds pre-configured credentials:
- `admin@durgalodge.com` / `admin123`
- `manager@durgalodge.com` / `manager123`
- `reception@durgalodge.com` / `reception123`
- `staff@durgalodge.com` / `staff123`

These exact default accounts and passwords are fully documented in the public `README.md`.

#### Impact
If the seed script is executed against a public production database, any user on the internet can log in as Admin and gain full administrative control over the hotel system.

#### Remediation
1. Never run `npm run seed` against a production database.
2. Provide a separate `scripts/create-admin.js` script that accepts an email and password via environment variables or interactive CLI prompt with a high-entropy password.
3. If the seed was already run in any staging/production database, immediately change the passwords or delete the seeded demo accounts via the `/users` dashboard.

---

### 🟠 SEC-04: Stateless JWT Verification Lacks Account Revocation Check (HIGH)

#### Description
`src/lib/session.ts` verifies tokens purely via cryptographic signature (`jwtVerify(session, key)`). `getSession()` returns `{ userId, role, expiresAt }` directly from the token payload without querying PostgreSQL.

Most server actions (`createBooking`, `checkInBooking`, `deleteBooking`, `user-actions.ts`) check `session.role` or `session.userId` returned from `getSession()`.

#### Impact
- If an employee is deactivated (`user.isActive = false`) or terminated, their active session cookie remains fully valid for up to 24 hours.
- If an employee's role is demoted (e.g. from `ADMIN` to `STAFF`), their existing token continues to be accepted as `ADMIN` until it expires.

#### Remediation
Use `getCurrentUser()` from `src/lib/auth.ts` or verify `isActive` in `getSession()`:
```typescript
export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  
  const payload = await decrypt(token)
  if (!payload?.userId) return null
  
  // Verify account is active in database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true }
  })
  if (!user || !user.isActive) return null
  
  return { ...payload, role: user.role }
}
```

---

### 🟠 SEC-05: Broken Access Control on Financial & Reporting Page Views (HIGH)

#### Description
While `src/app/(dashboard)/layout.tsx` checks `getCurrentUser()` to ensure users are authenticated, several sensitive dashboard pages lack role-based access checks:
- `/reports` (`src/app/(dashboard)/reports/page.tsx`)
- `/revenue` (`src/app/(dashboard)/revenue/page.tsx`)
- `/daily-closing` (`src/app/(dashboard)/daily-closing/page.tsx`)
- `/expenses` (`src/app/(dashboard)/expenses/page.tsx`)

In contrast, `/users`, `/settings`, and `/audit-log` enforce strict role checks:
```typescript
if (currentUser?.role !== 'ADMIN') redirect('/dashboard')
```

#### Impact
Front desk staff (`RECEPTION`) and housekeeping (`STAFF`) can navigate directly to `/reports` and `/revenue` to view property net profits, revenue breakdowns, executive expense summaries, and daily cash differences.

#### Remediation
Add role guards to `reports/page.tsx`, `revenue/page.tsx`, and `daily-closing/page.tsx`:
```typescript
const currentUser = await getCurrentUser()
if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
  redirect('/dashboard')
}
```

---

### 🟠 SEC-06: Hardcoded Fallback Database Connection String (HIGH)

#### Description
In `src/lib/db.ts` (line 5) and `scripts/seed.js` (line 8):
```typescript
const connectionString = process.env.DATABASE_URL || 'postgresql://admin:secure_password_here@localhost:5432/durga_lodge?sslmode=disable'
```
A fallback database connection string with default username and password is hardcoded into the source code.

#### Impact
1. If `DATABASE_URL` is omitted or misconfigured in production, the application attempts to connect to local default credentials instead of failing immediately with an explicit error.
2. Credentials in source code risk exposure if the code is shared or audited publicly.

#### Remediation
Remove default fallbacks in production files; throw immediately if `DATABASE_URL` is missing:
```typescript
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.')
}
```

---

### 🟡 SEC-07: Missing Rate Limiting and Account Lockout on Login (MEDIUM)

#### Description
`loginAction` in `src/server/actions/auth-actions.ts` verifies credentials with `argon2.verify()`, but contains no:
- IP-based rate limiting
- Failed login attempt counters
- Progressive delays (tarpitting)
- Account lockout after consecutive failures

#### Impact
An attacker can conduct automated brute-force attacks against staff email addresses. While Argon2 slows down offline cracking, an online endpoint receiving thousands of requests can cause high CPU utilization (denial of service) or eventual password guessing if weak passwords are used.

#### Remediation
1. Implement in-memory or Redis-based rate limiting on the `/login` action (e.g. max 5 failed attempts per 15 minutes per IP).
2. Record failed login attempts in the database and temporarily lock accounts after 5 consecutive failures.

---

### 🟡 SEC-08: File Upload Extension Discrepancy & Ephemeral Storage (MEDIUM)

#### Description
In `src/lib/storage.ts`:
```typescript
const extension = path.extname(file.name) || '.bin'
const uniqueName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`
```
The file extension is derived from the user-provided `file.name` rather than being mapped from the validated MIME type (`image/jpeg` -> `.jpg`, `application/pdf` -> `.pdf`).
Furthermore, files are written to local disk (`./public/uploads/receipts`).

#### Impact
1. An attacker could upload a file with MIME type `image/jpeg` but filename `exploit.html`. If served directly from the public web root, this could lead to Stored Cross-Site Scripting (XSS).
2. On serverless hosting (e.g., Vercel), local disk writes are read-only and ephemeral, causing uploaded receipt files to fail or disappear after container recycling.

#### Remediation
1. Map extensions strictly from `file.type`:
   ```typescript
   const EXTENSION_MAP: Record<string, string> = {
     'image/jpeg': '.jpg',
     'image/png': '.png',
     'image/webp': '.webp',
     'application/pdf': '.pdf',
   }
   const extension = EXTENSION_MAP[file.type] || '.bin'
   ```
2. For serverless deployments, utilize an S3/Cloudflare R2 bucket for receipt uploads.

---

### 🟡 SEC-09: Backup & Restore Scripts Incompatible with Hosted Databases (MEDIUM)

#### Description
`scripts/backup.sh`, `scripts/backup.ps1`, `scripts/restore.sh`, and `scripts/restore.ps1` explicitly invoke `docker exec -t durga_lodge_db pg_dump -U admin -d durga_lodge`.

#### Impact
When the application is connected to a hosted cloud PostgreSQL database (Neon, Supabase, AWS RDS, Render), running these scripts will fail or dump the local container rather than the cloud database.

#### Remediation
Update backup and restore scripts to use `$DATABASE_URL` via `pg_dump "$DATABASE_URL"` with SSL parameters.

---

### 🔵 SEC-10: Missing HTTP Security Headers (LOW)

#### Description
`next.config.ts` does not define HTTP security response headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`).

#### Impact
The application is not protected by browser-level defenses against clickjacking, MIME sniffing, or insecure protocol downgrades.

#### Remediation
Add standard security headers in `next.config.ts`:
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]
```

---

### 🔵 SEC-11: Deprecated Next.js Middleware Convention (LOW)

#### Description
Next.js 16.4.0 outputs a build warning:
`⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

#### Impact
Future Next.js major releases may remove `middleware.ts`.

#### Remediation
Migrate `src/middleware.ts` to `src/proxy.ts` using Next.js 16 codemods when convenient.

---

### 🟢 SEC-12: SQL Injection Immunity via Parameterized Prisma Queries (INFORMATIONAL)

#### Verification
All database queries across `src/` utilize Prisma Client's type-safe query engine (`prisma.booking.findMany`, `prisma.guest.create`, etc.). No `$queryRaw`, `$executeRaw`, or concatenated strings exist in application code. SQL injection vulnerabilities are successfully neutralized.

---

### 🟢 SEC-13: Time API Network Timeout & Fallback Resilience (INFORMATIONAL)

#### Verification
`src/lib/kolkata-time.ts` implements an `AbortController` with a 2.5-second timeout when fetching real-time Asia/Kolkata timestamps. If `timeapi.io` is unreachable, times out, or fails, the application gracefully falls back to the system clock with `toZonedTime(new Date(), HOTEL_TIMEZONE)`. This prevents operational hangs during check-in and checkout.

---

## 🎯 Production Readiness Verdict

**CURRENT VERDICT: NOT YET PRODUCTION READY**

Before deploying publicly:
1. Remediate **SEC-01** (add session/role checks to all read server actions).
2. Remediate **SEC-02** (enforce minimum 32-character `AUTH_SECRET` assertion).
3. Execute **SEC-03** (generate unique production passwords; do not seed demo passwords).
4. Remediate **SEC-04** and **SEC-05** (enforce active user checks and page role gates).
