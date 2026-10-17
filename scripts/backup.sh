#!/bin/bash
# scripts/backup.sh - Durga Lodge PostgreSQL Backup Script
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/durga_lodge_backup_$TIMESTAMP.sql.gz"

echo "📦 Creating database backup for DURGA LODGE..."

# Dump PostgreSQL using docker exec or local pg_dump
if docker ps --format '{{.Names}}' | grep -q "durga_lodge_db"; then
  docker exec -t durga_lodge_db pg_dump -U admin -d durga_lodge --clean --if-exists | gzip > "$BACKUP_FILE"
else
  pg_dump -U admin -d durga_lodge --clean --if-exists | gzip > "$BACKUP_FILE"
fi

echo "✅ Backup successfully saved to: $BACKUP_FILE"
echo "File size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
