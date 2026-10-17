# Backup & Disaster Recovery Guide — DURGA LODGE HMS

Data integrity is the highest priority for hotel operations. This guide documents manual snapshots, automated cron scheduling, and emergency restore procedures.

---

## 1. Backup Strategy Overview

| Tier | Frequency | Retention | Storage Target |
| :--- | :--- | :--- | :--- |
| **Daily Snapshot** | Every night at 02:00 IST | 30 Days | Local `./backups` + NAS |
| **Weekly Archive** | Every Sunday at 03:00 IST | 12 Weeks | Offsite / Encrypted Cloud |
| **Monthly Archive** | 1st of every month | 12 Months | Long-term cold storage |

---

## 2. Manual Backup Execution

### Linux / macOS (Bash)
```bash
# Make script executable
chmod +x scripts/backup.sh

# Run backup
./scripts/backup.sh
```
Output:
```
📦 Creating database backup for DURGA LODGE...
✅ Backup successfully saved to: ./backups/durga_lodge_backup_20261007_181500.sql.gz
```

### Windows (PowerShell)
```powershell
powershell -File scripts/backup.ps1
```
Output:
```
Creating database backup for DURGA LODGE...
Backup created successfully: .\backups\durga_lodge_backup_20261007_175513.sql (35323 bytes)
```

---

## 3. Automated Backup Scheduling

### Linux (Cron Job)
Add a cron entry to run nightly at 2:00 AM IST:
```bash
crontab -e
```
Add the following line:
```cron
0 2 * * * cd /opt/durga-lodge-hms && ./scripts/backup.sh >> /var/log/durga_lodge_backup.log 2>&1
```

### Windows (Task Scheduler)
Create a scheduled task via PowerShell:
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\Users\deepa\Dev works\Projects\scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "DurgaLodgeDatabaseBackup" -Description "Daily PostgreSQL backup for Durga Lodge HMS"
```

---

## 4. Disaster Recovery & Database Restoration

In the event of hardware failure, disk corruption, or accidental data loss:

### Step 1: Ensure PostgreSQL is Running
```bash
docker compose up -d postgres
```

### Step 2: Restore from SQL File

#### Linux / macOS:
```bash
./scripts/restore.sh ./backups/durga_lodge_backup_20261007_181500.sql.gz
```

#### Windows PowerShell:
```powershell
powershell -File scripts/restore.ps1 -BackupFile .\backups\durga_lodge_backup_20261007_175513.sql
```

### Step 3: Verify Restoration Integrity
Run the verification check script to ensure all records and rooms were restored:
```bash
npm test
```
Or query record counts:
```bash
docker exec durga_lodge_db psql -U admin -d durga_lodge -c 'SELECT count(*) FROM "Room"; SELECT count(*) FROM "Booking"; SELECT count(*) FROM "Payment";'
```

---

## 5. Backup Retention Cleanup Script

To automatically delete backups older than 30 days:
```bash
find ./backups -type f -name "durga_lodge_backup_*.sql*" -mtime +30 -exec rm {} \;
```
