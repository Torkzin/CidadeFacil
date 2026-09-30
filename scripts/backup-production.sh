#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
backup_dir="$project_dir/backups"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
database_tmp="$backup_dir/.database-$timestamp.dump.tmp"
uploads_tmp="$backup_dir/.uploads-$timestamp.tar.gz.tmp"

cleanup() {
  rm -f "$database_tmp" "$uploads_tmp"
}
trap cleanup EXIT INT TERM

mkdir -p "$backup_dir"
cd "$project_dir"

docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  sh -c 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$database_tmp"
mv "$database_tmp" "$backup_dir/database-$timestamp.dump"

docker compose --env-file .env.production -f docker-compose.production.yml --profile tools run --rm backup-helper \
  tar -czf "/backup/.uploads-$timestamp.tar.gz.tmp" -C /data .
mv "$uploads_tmp" "$backup_dir/uploads-$timestamp.tar.gz"

echo "Backup criado em $backup_dir"
