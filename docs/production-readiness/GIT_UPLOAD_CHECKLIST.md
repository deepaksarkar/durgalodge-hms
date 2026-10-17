# Git Upload & Security Checklist — Durga Lodge HMS

Follow this strict checklist before initializing Git and pushing the project to a public or private repository.

---

## 🚫 1. Files That MUST Be Excluded (Ignored)

Verify that the following files and directories are **NEVER** staged or committed:

| Category | Patterns Excluded in `.gitignore` | Reason |
| :--- | :--- | :--- |
| **Secrets & Environment** | `.env`, `.env.*`, `.env*.local` | Contains production database passwords, JWT secret keys, and API tokens. |
| **Database Dumps** | `backups/`, `*.sql`, `*.sql.gz`, `*.dump` | Contains real guest PII, Aadhaar numbers, and transaction folios. |
| **Build Artifacts** | `.next/`, `out/`, `build/`, `*.tsbuildinfo` | Compiled JavaScript and cache files. |
| **Dependencies** | `node_modules/` | External third-party packages. |
| **Receipt Uploads** | `public/uploads/receipts/*` (except `.gitkeep`) | Scanned vendor invoices, guest payment receipts. |
| **OS / Editor Files** | `.DS_Store`, `npm-debug.log*`, `yarn-error.log*`, `*.pem` | Local machine metadata and private keys. |

---

## ✅ 2. Files That MUST Be Committed

These files constitute the clean, reproducible application codebase:

- **Source Code**:
  - `src/app/**` (Pages, layouts, routes)
  - `src/components/**` (UI components)
  - `src/server/actions/**` (Server actions)
  - `src/lib/**` (Utilities, auth, session, database pool, calculators)
  - `src/middleware.ts` (Route protection)
- **Database & Prisma**:
  - `prisma/schema.prisma` (Database schema definition)
  - `prisma/migrations/**` (Prisma migration history)
  - `prisma.config.ts` (Prisma 7 configuration)
- **Configuration & Dependencies**:
  - `package.json` & `package-lock.json`
  - `tsconfig.json` & `next.config.ts`
  - `eslint.config.mjs`
  - `.gitignore` (Updated secure version)
  - `.env.example` (Template with placeholders only)
  - `Dockerfile` & `docker-compose.yml`
- **Tests & Scripts**:
  - `tests/**` (Automated integration & unit tests)
  - `scripts/seed.js`
  - `scripts/sync-db.js`
  - `scripts/backup.sh`, `scripts/restore.sh`, `scripts/backup.ps1`, `scripts/restore.ps1`
- **Documentation**:
  - `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DEPLOYMENT.md`, `SECURITY.md`
  - `docs/production-readiness/**` (Production readiness and security audit deliverables)

---

## 🔍 3. Pre-Commit Verification Commands

Run these commands in PowerShell from the project root (`c:\Users\deepa\Dev works\Projects`) before staging:

### Step 1: Scan for Accidental Secrets or Database Dumps
```powershell
# 1. Verify no active .env file is tracked
Get-ChildItem -File -Include .env,.env.production,.env.local

# 2. Check for database dumps outside the backups folder
Get-ChildItem -Recurse -File -Include *.sql,*.dump | Where-Object { $_.FullName -notmatch "prisma\\migrations" }

# 3. Verify tests pass cleanly
npm test
```

### Step 2: Initialize Git and Check Staged Files
```powershell
# Initialize git repository
git init

# Check git status
git status
```

> [!WARNING]
> Carefully review the output of `git status`!
> If you see `.env` or any file from `backups/` listed under `Untracked files`, **DO NOT RUN `git add .`**. Check `.gitignore` immediately.

### Step 3: Stage and Commit Clean Files
```powershell
git add .
git status
```
Verify that every staged file is source code, documentation, or configuration. No `.env` or `.sql` files should appear in green.

```powershell
git commit -m "feat: initial commit of Durga Lodge HMS production codebase"
```

---

## 🚀 4. Remote GitHub Repository Setup

1. Open [GitHub](https://github.com/new).
2. Create a new repository named `durga-lodge-hms`.
3. Select **Private** (Crucial: do NOT select Public).
4. Do **not** initialize with a README, .gitignore, or license (these already exist in the project).
5. Link and push your local branch:
   ```powershell
   git branch -M main
   git remote add origin https://github.com/<your-account>/durga-lodge-hms.git
   git push -u origin main
   ```
