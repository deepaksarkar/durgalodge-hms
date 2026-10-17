# Architecture & System Design — DURGA LODGE HMS

This document details the architectural principles, layer separation, data flow, and concurrency safeguards implemented in the **DURGA LODGE Hotel Management System**.

---

## 1. Architectural Philosophy: Clean Modular Monolith

For a real operational lodge with 16 rooms and on-premise/self-hosted deployment requirements, distributed microservices introduce unnecessary operational complexity, network latency, and eventual consistency failures.

DURGA LODGE HMS is engineered as a **Clean Modular Monolith**:
- Single unified deployment container.
- Strongly separated logical boundaries.
- Zero network hops between business logic and database transactions.
- Zero floating-point rounding errors.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / BROWSER UI                             │
│   (Responsive Desktop, Tablet, Android, iPhone Tailwind Views)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Server Actions
┌───────────────────────────────────▼────────────────────────────────────┐
│                       NEXT.JS APP LAYER (App Router)                   │
│   ├── app/(dashboard)/*       (Server-rendered UI pages)               │
│   ├── middleware.ts           (Session authentication gatekeeper)      │
│   └── components/*            (Modular UI & Interactive Drawers)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct TypeScript Function Calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                    BUSINESS & APPLICATION LOGIC LAYER                  │
│   ├── src/server/actions/*    (Booking, Checkin, Checkout, DailyClose) │
│   ├── src/lib/auth.ts         (RBAC Authorization & Permission Matrix) │
│   ├── src/lib/booking-calc.ts (Paise integer calculation engine)       │
│   ├── src/lib/date-utils.ts   (Asia/Kolkata business date logic)       │
│   └── src/lib/storage.ts      (Validated local receipt uploads)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma ORM & Transactions
┌───────────────────────────────────▼────────────────────────────────────┐
│                       DATA ACCESS & PERSISTENCE                        │
│   ├── @prisma/client + @prisma/adapter-pg (Direct connection pool)     │
│   └── PostgreSQL 15 Database (ACID transactions, indexes, FKs)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Separation & Directory Structure

- **`src/app/`**: Next.js App Router endpoints, server layouts, dynamic segment routes, and error boundaries.
- **`src/components/`**: Domain-grouped UI components:
  - `components/rooms/`: Visual room status grid, status badges, floor filters.
  - `components/bookings/`: Reservation table, creation modals, filter controls.
  - `components/operations/`: Reception check-in cards and check-out folio settlement cards.
  - `components/invoices/`: Printable `@media print` tax invoice.
  - `components/daily-closing/`: Physical cash reconciliation and audit lock interface.
  - `components/reports/`: Interactive financial statement views and export triggers.
- **`src/lib/`**: Reusable core infrastructure:
  - `booking-calculator.ts`: Zero-float monetary arithmetic.
  - `currency.ts`: Indian Rupee formatting (`Intl.NumberFormat('en-IN')`).
  - `date-utils.ts`: Indian Standard Time (`Asia/Kolkata`) timezone conversions.
  - `session.ts`: Jose JWT encryption in HTTP-Only cookies.
  - `db.ts`: Singleton PostgreSQL pool and Prisma client.
- **`src/server/actions/`**: Server Actions handling atomic mutations, permission validation, and audit trail insertions.

---

## 3. Financial Integrity: Integer Paise Architecture

Floating point arithmetic (`0.1 + 0.2 = 0.30000000000000004`) is strictly forbidden for monetary records.

- **Storage & Engine**: All prices, tariffs, discounts, extra charges, taxes, payments, and balances are stored and calculated as integer **Paise**:
  $$\text{₹}1,250.00 = 125,000\text{ paise}$$
- **Formula**:
  $$\text{Room Charges} = \text{Tariff} \times \text{Nights}$$
  $$\text{Taxable Subtotal} = \text{Room Charges} + \text{Extra Charges} - \text{Discount}$$
  $$\text{Tax (GST)} = \text{round}\left(\frac{\text{Taxable Subtotal} \times \text{Basis Points}}{10,000}\right)$$
  $$\text{Total Amount} = \text{Taxable Subtotal} + \text{Tax}$$
  $$\text{Outstanding Balance} = \text{Total Amount} - \sum \text{Payments}$$

---

## 4. Double-Booking Prevention & Concurrency

To prevent race conditions where two receptionists simultaneously book the same room for overlapping dates:

1. **Overlap Validation Query**:
   Two intervals $[A_{\text{start}}, A_{\text{end}})$ and $[B_{\text{start}}, B_{\text{end}})$ collide if and only if:
   $$\text{CheckIn}_{\text{new}} < \text{CheckOut}_{\text{existing}} \quad \text{AND} \quad \text{CheckOut}_{\text{new}} > \text{CheckIn}_{\text{existing}}$$
2. **Transactional Boundary**:
   The conflict check, guest creation, booking insertion, and room status transition execute inside an atomic PostgreSQL transaction:
   ```typescript
   await prisma.$transaction(async (tx) => {
     const conflict = await tx.booking.findMany({ /* overlap query */ });
     if (conflict.length > 0) throw new Error("Room conflict: already booked.");
     return await tx.booking.create({ /* ... */ });
   });
   ```
3. **Database Indexing**:
   The `Booking` table features a compound index on `[roomId, checkInDate, checkoutDate, status]` to ensure sub-millisecond conflict checks even with tens of thousands of historical records.

---

## 5. Timezone & Hotel Business Date

- The hotel operates in **Asia/Kolkata** (IST, UTC+05:30).
- Standard hotel check-in time is 12:00 PM and check-out is 11:00 AM.
- Night auditor / late check-ins occurring at 12:30 AM are associated with the active business date rather than distorted by browser UTC offsets.

---

## 6. Immutable Audit Trail

Every state change produces an append-only `AuditLog` record containing:
- `userId`: Authenticated staff member who initiated the action.
- `action`: Type of event (`BOOKING_CREATED`, `CHECK_IN`, `CHECK_OUT`, `PAYMENT_ADDED`, `DAILY_CLOSING_FINALIZED`).
- `entity` & `entityId`: Target table and record UUID.
- `metadata`: JSON context describing values modified.
- `timestamp`: UTC timestamp with IST conversion on display.
