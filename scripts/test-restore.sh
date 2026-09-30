#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
dump_file=${1:-}
if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
  echo "Uso: $0 backups/database-AAAAMMDDTHHMMSSZ.dump" >&2
  exit 1
fi

test_db="cidadefacil_restore_test_$(date -u +%Y%m%d%H%M%S)"
cd "$project_dir"

cleanup() {
  docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
    sh -c 'dropdb --if-exists --force -U "$POSTGRES_USER" "$1"' sh "$test_db" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$test_db"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  sh -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$1"' sh "$test_db" < "$dump_file"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c "select count(*) as municipalities from municipalities;" -c "select count(*) as requests from requests;"' sh "$test_db"

echo "Restore validado com sucesso em banco temporário: $test_db"

