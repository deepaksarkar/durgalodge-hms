param (
  [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "durga_lodge_backup_$Timestamp.sql"

Write-Host "Creating database backup for DURGA LODGE..."

docker exec durga_lodge_db pg_dump -U admin -d durga_lodge --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8

if (Test-Path $BackupFile) {
  $fileItem = Get-Item $BackupFile
  $fileSize = $fileItem.Length
  Write-Host "Backup created successfully: $BackupFile ($fileSize bytes)" -ForegroundColor Green
} else {
  Write-Host "Backup failed." -ForegroundColor Red
}
