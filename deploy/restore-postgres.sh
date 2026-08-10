#!/bin/sh
set -eu

if [ "${ALLOW_RESTORE:-}" != "yes" ]; then
  echo "Set ALLOW_RESTORE=yes after confirming the target database and backup file."
  exit 1
fi

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: ALLOW_RESTORE=yes restore-postgres.sh /backups/syncspace-TIMESTAMP.dump"
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="${PGDATABASE:?PGDATABASE is required}" "$1"
echo "Restore completed from: $1"
