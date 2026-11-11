#!/bin/bash
set -e
cd /opt/habit-tracker
set -a
. ./.env
set +a

BACKUP_DIR="/var/backups/habit"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/habit-$TIMESTAMP.sql.gz"

docker compose exec -T db pg_dump -U "$DB_USER" -d habit | gzip > "$FILE"
echo "Backup created: $FILE"
