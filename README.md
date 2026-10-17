<<<<<<< HEAD
# durgalodge-hms
=======
# DURGA LODGE — Hotel Management System (HMS)

Production-grade, self-hostable, full-stack Hotel Management System built specifically for the operational needs of **DURGA LODGE** (Bhubaneswar, Odisha, India).

Designed with a modern SaaS architecture, strict double-booking collision prevention, real PostgreSQL database transactions, immutable audit trails, integer paise currency calculations, cashier daily closings, and full mobile/tablet responsiveness.

---

## 🌟 Key Functional Modules

1. **Visual Room Operations Grid**:
   - 16 initial rooms (Floor 1: `101`–`115`, Floor 2: `201`–`203`) with dynamic floor and room capacity expansion.
   - Statuses: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `MAINTENANCE`, `OUT_OF_SERVICE`.
   - Real-time room status transitions, stay information, and housekeeping queue.

2. **Booking & Reservation Engine**:
   - Atomic double-booking conflict protection: rejects overlapping bookings at the database level.
   - Server-side financial calculation engine using integer paise (zero floating-point errors).
   - Advance payments, discounts, extra charges, and 12% GST breakdown.

3. **Front-Desk Check-In & Check-Out Workflows**:
   - Quick verification of guest photo ID and room keys.
   - Folio checkout balance warnings and 1-click settlement.
   - Automatic room transition to `CLEANING` on checkout.

4. **Guest Directory (CRM)**:
   - Lifetime stay counters, total expenditure tracking, stay duration averages, and full historical stay timelines.

5. **Payments Ledger**:
   - First-class database entities supporting Cash, UPI, Debit/Credit Card, and Bank Transfers (NEFT/RTGS).
   - Multiple split payments per booking.

6. **Expenses & Digital Receipt Storage**:
   - 15 standard expense categories + custom category creation.
   - Local storage provider with MIME type verification (PDF/JPEG/PNG) and size limits.

7. **Hotel Daily Closing**:
   - End-of-day cash drawer reconciliation: Opening Cash + Cash Received - Cash Expenses = Expected Cash.
   - Cashier physical count difference calculation (shortage / excess).
   - Immutable audit locking preventing accidental historical edits.

8. **Audited Financial Reports & Exports**:
   - Revenue Report, Expense Report, Profit & Loss (P&L), Occupancy Analytics (ADR & RevPAR), Outstanding Receivables, and Room Performance.
   - 1-click **Excel (.XLSX)** and **CSV** downloads.
   - Printer-friendly tax invoice (`@media print` optimized).

9. **Role-Based Access Control (RBAC)**:
   - `ADMIN`: Full system control, user creation, settings, and audit logs.
   - `MANAGER`: Operations, finance, expenses, and reporting.
   - `RECEPTION`: Front-desk check-in/out, bookings, and payments.
   - `STAFF`: Room cleaning and maintenance queues only.

---

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: PostgreSQL 15+
- **ORM & Driver**: Prisma 7 with `@prisma/adapter-pg` driver adapter
- **Security & Auth**: Argon2 password hashing, HTTP-Only secure cookies, Jose JWT
- **Styling & UI**: Tailwind CSS v4, Lucide Icons
- **Charts**: Recharts
- **Spreadsheets**: XLSX

---

## 🔐 Default Seed Credentials

Run `npm run seed` to populate the initial database with the following demo credentials:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@durgalodge.com` | `admin123` | Full system control, settings, users, audit logs |
| **Manager** | `manager@durgalodge.com` | `manager123` | Operations, finance, expenses, reports |
| **Reception** | `reception@durgalodge.com` | `reception123` | Bookings, check-in, check-out, payments, guests |
| **Staff** | `staff@durgalodge.com` | `staff123` | Room status, cleaning, maintenance only |

---

## ⚙️ Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (or local PostgreSQL 15+)

### 1. Clone & Install
```bash
npm install
```

### 2. Configure Environment
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
Default connection string:
```env
DATABASE_URL="postgresql://admin:secure_password_here@localhost:5432/durga_lodge?schema=public"
AUTH_SECRET="super_secret_production_key_minimum_32_characters_long!!"
HOTEL_TIMEZONE="Asia/Kolkata"
CURRENCY="INR"
```

### 3. Start Database & Seed
```bash
# Start PostgreSQL via Docker Compose
docker compose up -d postgres

# Push schema and seed data
npm run db:sync
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Docker Production Deployment

To run the entire system (App + PostgreSQL) with a single command:

```bash
docker compose up -d --build
```

Access the application at [http://localhost:3000](http://localhost:3000).

### Cloudflare Tunnel (Optional Remote Access)
To make Durga Lodge HMS accessible remotely without opening router ports or static public IPs:
1. Create a Cloudflare Tunnel in your Cloudflare Zero Trust dashboard.
2. Add your tunnel token to `.env`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN="eyJh..."
   ```
3. Start the tunnel profile:
   ```bash
   docker compose --profile tunnel up -d
   ```

---

## 💾 Backup & Restore

### Create Manual Backup
- **Windows PowerShell**:
  ```powershell
  powershell -File scripts/backup.ps1
  ```
- **Linux / macOS**:
  ```bash
  chmod +x scripts/backup.sh
  ./scripts/backup.sh
  ```
Backups are saved to `./backups/durga_lodge_backup_YYYYMMDD_HHMMSS.sql`.

### Restore Database
- **Windows PowerShell**:
  ```powershell
  powershell -File scripts/restore.ps1 -BackupFile .\backups\durga_lodge_backup_YYYYMMDD_HHMMSS.sql
  ```
- **Linux / macOS**:
  ```bash
  ./scripts/restore.sh ./backups/durga_lodge_backup_YYYYMMDD_HHMMSS.sql
  ```

---

## 🧪 Automated Tests

Run the full automated test suite (unit + integration tests against real PostgreSQL):

```bash
npm test
```

Test coverage includes:
- Monetary integer paise calculations
- Tax and discount engine
- ADR, RevPAR, and occupancy formulas
- Argon2 password hashing verification
- Atomic booking creation and double-booking conflict rejection
- Multiple split payments
- Atomic check-in and check-out workflows
- Expense categorization and cashier daily closing calculations
>>>>>>> 227748b (feat: Durga Lodge HMS production ready)
