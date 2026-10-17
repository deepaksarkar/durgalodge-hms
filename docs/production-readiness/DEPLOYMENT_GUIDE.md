# Production Deployment Guide — Durga Lodge HMS

This guide provides end-to-end instructions for deploying the Durga Lodge Hotel Management System to a public cloud environment with a hosted PostgreSQL database.

---

## 🏗️ Architecture & Stack Specifications

- **Application Framework**: Next.js 16.4.0 (Turbopack, App Router, React 19)
- **Database & ORM**: PostgreSQL 15+, Prisma 7.10.0, `@prisma/adapter-pg` 7.10.0, `pg` 8.23.1
- **Authentication**: Stateless HS256 JWT (`jose` 6.2.12), Argon2 password hashing (`argon2` 0.45.1)
- **Target Deployment**: Hosted PostgreSQL (e.g. Neon, Supabase, AWS RDS, Render Postgres) + Next.js Server (Render, Railway, Fly.io, or VPS via Docker)

---

## Step 1: Provision Hosted PostgreSQL

Before deploying the Next.js application, provision a persistent cloud PostgreSQL database:

1. **Choose a Hosted Provider**:
   - Recommended: **Neon** (serverless Postgres with connection pooling), **Supabase**, **Render PostgreSQL**, or **AWS RDS PostgreSQL**.
2. **Database Specifications**:
   - Version: PostgreSQL 15 or 16.
   - Region: Select a region close to Puri, Odisha (e.g. `ap-south-1` Mumbai / India) for lowest network latency.
   - Enforce SSL: Ensure SSL is enabled (`sslmode=require`).
3. **Obtain Connection String**:
   - Pooled connection URI format:
     ```
     postgresql://<username>:<password>@<host>:5432/<database>?schema=public&sslmode=require
     ```
   - Store this connection string securely. This will be your production `DATABASE_URL`.

---

## Step 2: Prepare the Private Git Repository

> [!IMPORTANT]
> The repository **must be private** to protect proprietary hotel configuration and business logic.

1. **Install Git** (if not already installed on Windows):
   - Download and install Git from [git-scm.com](https://git-scm.com/download/win).
2. **Verify `.gitignore`**:
   - Ensure `.env`, `.env.*`, `backups/`, `*.sql`, and `public/uploads/receipts/*` are excluded (already configured).
3. **Initialize Repository & Commit**:
   ```powershell
   # Working Directory: c:\Users\deepa\Dev works\Projects
   git init
   git branch -M main
   git add .
   git status  # Review that NO .env or .sql files are staged
   git commit -m "feat: Durga Lodge HMS initial production codebase"
   ```
4. **Push to Private GitHub Repository**:
   ```powershell
   git remote add origin https://github.com/<your-username>/durga-lodge-hms.git
   git push -u origin main
   ```

---

## Step 3: Configure Production Environment Variables

In your cloud hosting management dashboard (e.g., Render, Railway, Vercel), configure the following environment variables:

| Key | Example / Instructions | Secret? |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:password@cloud-host:5432/durga_lodge?schema=public&sslmode=require` | **YES** |
| `AUTH_SECRET` | 32+ character random string generated via OpenSSL | **YES** |
| `NODE_ENV` | `production` | No |
| `HOTEL_TIMEZONE` | `Asia/Kolkata` | No |
| `CURRENCY` | `INR` | No |
| `APP_URL` | `https://durga-lodge.yourdomain.com` | No |

### How to Generate a Secure `AUTH_SECRET`:
Run this in any terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Step 4: Apply Database Migrations Safely

> [!CAUTION]
> **NEVER run `npx prisma migrate reset` or `npx prisma db push` against production.**
> `prisma migrate reset` will permanently delete all guest bookings, payments, and rooms!

Use **`prisma migrate deploy`**, which executes only pending migrations from `prisma/migrations/` in an atomic transaction:

### Option A: From Local Machine (One-Time Initialization)
Point your temporary local environment variable to the production database and run:
```powershell
# Set temporary connection string in your PowerShell session
$env:DATABASE_URL = "postgresql://<user>:<password>@<cloud-host>:5432/<database>?sslmode=require"

# Apply pending migrations
npx prisma migrate deploy

# Verify schema status
npx prisma migrate status

# Clear the variable from your terminal session
Remove-Item env:DATABASE_URL
```

### Option B: In Cloud Build / Deployment Pipeline
Add migration execution to the build script in your cloud provider:
```bash
npx prisma migrate deploy && npm run build
```

---

## Step 5: Create Initial Production Admin Account

**Do NOT run `npm run seed` in production**, as this seeds public demo passwords (`admin123`, `manager123`).

Create a secure admin user creation script or run a one-time Node.js script:

```javascript
// scripts/create-production-admin.js
require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const argon2 = require('argon2')

async function createAdmin() {
  const email = process.env.ADMIN_INITIAL_EMAIL
  const password = process.env.ADMIN_INITIAL_PASSWORD

  if (!email || !password || password.length < 8) {
    throw new Error('Please set ADMIN_INITIAL_EMAIL and a strong ADMIN_INITIAL_PASSWORD (min 8 chars)')
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const passwordHash = await argon2.hash(password)
  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { passwordHash },
    create: {
      email: email.toLowerCase().trim(),
      name: 'Durga General Manager',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log(`✅ Production Admin created: ${admin.email}`)
  await prisma.$disconnect()
  await pool.end()
}

createAdmin().catch(console.error)
```

Run with your strong credentials:
```powershell
$env:DATABASE_URL = "postgresql://..."
$env:ADMIN_INITIAL_EMAIL = "owner@durgalodge.com"
$env:ADMIN_INITIAL_PASSWORD = "<STRONG_UNIQUE_PASSWORD>"
node scripts/create-production-admin.js
```

---

## Step 6: Deploy the Next.js Application

### Deployment Option 1: Docker (Render / Railway / DigitalOcean / VPS)
The project includes a production multi-stage `Dockerfile`:
```bash
# Build production container
docker build -t durga-lodge-hms .

# Run container
docker run -d \
  --name durga_lodge \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  -e NODE_ENV="production" \
  -e HOTEL_TIMEZONE="Asia/Kolkata" \
  -e CURRENCY="INR" \
  -v durga_receipts:/app/public/uploads/receipts \
  durga-lodge-hms
```

### Deployment Option 2: Render / Railway / Vercel (PaaS)
1. Link your private GitHub repository in the PaaS dashboard.
2. Build Command: `npm run build`
3. Start Command: `npm start`
4. Set Environment Variables: `DATABASE_URL`, `AUTH_SECRET`, `NODE_ENV`, `HOTEL_TIMEZONE`, `CURRENCY`.

---

## Step 7: Post-Deployment Verification Checklist

Verify all workflows before handing the system over to front desk staff:

1. **Verify Independence from Local PC**:
   - **Shut down local Docker Desktop** and close your laptop.
   - Open your mobile phone or browser and navigate to `https://durga-lodge.yourdomain.com/login`.
   - Ensure the login screen loads and communicates with the hosted database.
2. **Authentication**:
   - Log in with your new production admin credentials.
   - Inspect the cookie in DevTools: verify `session` cookie has `HttpOnly`, `Secure`, and `SameSite=Lax`.
   - Log out and verify you are redirected to `/login`.
3. **Room Inventory Setup**:
   - Navigate to `/settings` or `/rooms` and verify room inventory is loaded or create your initial rooms (101-115, 201-203).
4. **End-to-End Operational Workflow**:
   - **New Reservation**: Create a test booking on `/bookings`.
   - **Check-In**: Check the guest in on `/check-ins`. Room status must change to `OCCUPIED`.
   - **Record Payment**: Record an advance UPI or Cash payment on the booking folio.
   - **Check-Out**: Initiate checkout on `/check-outs`. Settle remaining balance. Room must change to `CLEANING`.
   - **Invoice**: View and print the invoice on `/bookings/[id]/invoice`.
5. **Daily Closing & Reporting**:
   - Open `/daily-closing`. Verify cash and UPI totals match recorded payments.
   - Open `/reports` and `/revenue` to verify financial statements render correctly.
