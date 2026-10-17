param (
  [Parameter(Mandatory=$true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupFile)) {
  Write-Host "Error: Backup file not found: $BackupFile" -ForegroundColor Red
  exit 1
}

Write-Host "Restoring database for DURGA LODGE from $BackupFile..." -ForegroundColor Cyan

Get-Content -Path $BackupFile | docker exec -i durga_lodge_db psql -U admin -d durga_lodge

Write-Host "Database restore completed successfully!" -ForegroundColor Green
