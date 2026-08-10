#!/bin/sh
set -eu

backup_root=/backups
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$backup_root/syncspace-$timestamp.dump"

mkdir -p "$backup_root"
pg_dump --format=custom --compress=9 --file="$backup_file"
pg_restore --list "$backup_file" >/dev/null
find "$backup_root" -type f -name 'syncspace-*.dump' -mtime "+$retention_days" -delete
echo "Verified PostgreSQL backup: $backup_file"
