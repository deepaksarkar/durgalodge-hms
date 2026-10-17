# Database Backup & Disaster Recovery Guide — Durga Lodge HMS

Hotel operational data—including guest identification records, active bookings, payments, and financial closing ledgers—must be safeguarded against infrastructure failures, accidental deletions, and hosting provider downtimes.

This document details procedures for creating, automating, and verifying backups of the Durga Lodge PostgreSQL database.

---

## ⚠️ Avoiding Data Loss on Hosted Platforms

If using free-tier or shared cloud hosting (e.g. Render Free, Neon Free, Supabase Free):
- **Instance Sleep / Inactivity Pause**: Some free databases pause after 15 minutes of inactivity, causing cold starts or connection timeouts for morning front desk staff.
- **Inactivity Deletion**: Platforms like Supabase Free pause databases after 7 days of inactivity; projects inactive for 30+ days risk project deletion.
- **Ephemerality**: Ephemeral containers without attached persistent volumes reset all data on container restart.

> [!IMPORTANT]
> **Production Recommendation**:
> Use a database with **daily automated snapshots** (e.g. Neon Pro, Supabase Pro, Render Managed Postgres, or AWS RDS). Automated daily backups guarantee point-in-time recovery (PITR) regardless of local machine state.

---

## 🛠️ Universal Backup Command (Using `DATABASE_URL`)

The original scripts in `scripts/backup.sh` assumed a local Docker container (`durga_lodge_db`). When connected to a hosted cloud PostgreSQL database, use standard `pg_dump` with your production `DATABASE_URL`:

### PowerShell (Windows)
```powershell
# Set your production database URL
$env:DATABASE_URL = "postgresql://user:password@cloud-host:5432/durga_lodge?sslmode=require"

# Create timestamped backup file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups\durga_lodge_prod_$timestamp.sql"

# Execute pg_dump
pg_dump $env:DATABASE_URL --clean --if-exists --no-owner --no-privileges -F p -f $backupFile

Write-Host "✅ Backup created successfully: $backupFile"
```

### Bash (Linux / macOS / Cloud Cron)
```bash
export DATABASE_URL="postgresql://user:password@cloud-host:5432/durga_lodge?sslmode=require"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="./backups/durga_lodge_prod_${TIMESTAMP}.sql.gz"

mkdir -p ./backups
pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges | gzip > "$BACKUP_FILE"

echo "✅ Backup successfully created at: $BACKUP_FILE"
```

### Parameter Breakdown:
- `--clean`: Generates `DROP TABLE IF EXISTS` commands before creation, allowing clean re-import.
- `--if-exists`: Avoids errors on non-existent tables during clean drops.
- `--no-owner`: Prevents setting table ownership to specific cloud roles that may not exist on other databases.
- `--no-privileges`: Omits grant/revoke commands.
- `gzip`: Compresses the SQL dump to save storage.

---

## 🔄 Restoration Procedure

> [!CAUTION]
> **Restoration is destructive** to the destination database. It drops existing tables and replaces them with data from the backup file.
> **Always test restoration on a staging/development database first, never directly on production without a fresh pre-restore backup.**

### Step 1: Create a Safety Backup of Current State
Before restoring an older backup, dump the current database:
```bash
pg_dump "$DATABASE_URL" | gzip > "./backups/pre_restore_safety_backup.sql.gz"
```

### Step 2: Execute Restoration

#### From Compressed File (`.sql.gz`)
```bash
gunzip -c ./backups/durga_lodge_backup_20261010_120000.sql.gz | psql "$DATABASE_URL"
```

#### From Plain SQL (`.sql`)
```powershell
# Windows PowerShell
Get-Content ./backups/durga_lodge_backup_20261010_120000.sql | psql $env:DATABASE_URL
```

### Step 3: Run Post-Restore Verification
After restoration:
1. Verify database integrity using Prisma:
   ```bash
   npx prisma migrate status
   ```
2. Check that user accounts, rooms, and bookings exist:
   ```bash
   node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); Promise.all([prisma.user.count(), prisma.room.count(), prisma.booking.count()]).then(([u, r, b]) => console.log({ users: u, rooms: r, bookings: b }));"
   ```

---

## ⏰ Automated Scheduled Backup Strategy

For production resilience without manual daily downloads:

1. **Provider Automated Backups (Tier 1)**:
   - Enable automated backups in your cloud database provider console (Neon, Supabase, Render). Set retention to at least **7 days**.
2. **Offsite GitHub Actions Backup Job (Tier 2)**:
   - Configure a private GitHub Actions workflow that runs nightly at `03:00 AM IST`, dumps the database using secrets (`${{ secrets.DATABASE_URL }}`), and uploads the encrypted dump to private cloud storage (AWS S3, Cloudflare R2, or Google Cloud Storage).
3. **Local Cold Storage (Tier 3)**:
   - Download a monthly full snapshot to hotel premises storage (office desktop or external drive) for compliance and physical auditing.
