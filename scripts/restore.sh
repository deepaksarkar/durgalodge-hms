#!/bin/bash
# scripts/restore.sh - Durga Lodge PostgreSQL Restore Script
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <path-to-sql-or-sql.gz-file>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠️  Restoring database for DURGA LODGE from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker exec -i durga_lodge_db psql -U admin -d durga_lodge
else
  cat "$BACKUP_FILE" | docker exec -i durga_lodge_db psql -U admin -d durga_lodge
fi

echo "✅ Database restore completed successfully!"
