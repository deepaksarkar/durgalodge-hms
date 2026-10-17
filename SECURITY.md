# Security & Hardening Specification — DURGA LODGE HMS

DURGA LODGE HMS handles financial records, customer personally identifiable information (PII), and cash register transactions. This document outlines the security architecture and defensive controls.

---

## 1. Authentication & Password Security

- **Hashing Algorithm**: Passwords are hashed using **Argon2** (`argon2.hash()`), the state-of-the-art memory-hard hashing standard recommended by OWASP. Plaintext passwords never touch logs or databases.
- **Session Tokens**: Sessions are cryptographically signed using **Jose** (`SignJWT`) with `HS256` and verified server-side (`jwtVerify`).
- **HTTP-Only Cookies**:
  - `httpOnly: true`: Completely inaccessible to client-side JavaScript (`document.cookie`), neutralizing token theft via Cross-Site Scripting (XSS).
  - `sameSite: 'lax'`: Protects against Cross-Site Request Forgery (CSRF).
  - `secure: true`: Enforced over HTTPS in production.
  - `expiresAt`: Fixed 24-hour expiration window.

---

## 2. Server-Side Role-Based Authorization (RBAC)

Authorization is enforced strictly on the server in every Server Action and API endpoint. Hiding buttons in the client UI is purely a cosmetic convenience; the server validates role permissions independently:

```typescript
export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(', ')}] role`);
  }
  return user;
}
```

### Permission Matrix:
| Capability | ADMIN | MANAGER | RECEPTION | STAFF |
| :--- | :---: | :---: | :---: | :---: |
| View Operations Dashboard | ✅ | ✅ | ✅ | ❌ |
| Create / Modify Bookings | ✅ | ✅ | ✅ | ❌ |
| Check-In / Check-Out Guests | ✅ | ✅ | ✅ | ❌ |
| Receive & Record Payments | ✅ | ✅ | ✅ | ❌ |
| View Financial Reports & P&L | ✅ | ✅ | ❌ | ❌ |
| Record Operational Expenses | ✅ | ✅ | ❌ | ❌ |
| Finalize Daily Closing | ✅ | ✅ | ❌ | ❌ |
| Update Hotel Settings & Tariffs| ✅ | ✅ | ❌ | ❌ |
| Manage Staff Accounts | ✅ | ❌ | ❌ | ❌ |
| View Compliance Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Update Room Cleaning Status | ✅ | ✅ | ✅ | ✅ |

---

## 3. Defense Against Common Vulnerabilities

### SQL Injection (SQLi)
- All database queries are routed through **Prisma ORM** which utilizes parameterized statements and prepared queries. Raw concatenated user strings are never passed to the database engine.

### Cross-Site Scripting (XSS)
- Next.js and React automatically encode all dynamically rendered strings before injecting them into the DOM.
- No `dangerouslySetInnerHTML` is used in application source code.

### Cross-Site Request Forgery (CSRF)
- Server Actions in Next.js require valid Origin headers and same-site session cookies, preventing forged requests from external origins.

---

## 4. Secure File Uploads (Receipts Storage)

When uploading invoices and receipts for expense claims:
1. **MIME Type Validation**: Restricted strictly to `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Executable files (`.exe`, `.sh`, `.php`, `.js`) are immediately rejected.
2. **File Size Limit**: Strictly enforced at 5 MB max per document.
3. **Randomized Filenames**: Files are saved with cryptographically randomized timestamped filenames (`receipt_<timestamp>_<random6>.ext`), completely eliminating path traversal (`../../`) and file overwrite attacks.

---

## 5. Audit Logging & Non-Repudiation

All critical business and administrative actions generate an append-only record in the `AuditLog` table containing:
- Authenticated User UUID
- Action name (e.g. `BOOKING_CREATED`, `CHECK_IN`, `CHECK_OUT`, `PAYMENT_ADDED`, `ROOM_STATUS_CHANGE`, `SETTINGS_UPDATED`)
- Target entity and entity ID
- Metadata JSON payload
- Timestamp in UTC
- Audit log records cannot be edited or pruned through the application UI.
