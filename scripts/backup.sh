#!/bin/sh
# Dump the database to backups/element-quest-YYYY-MM-DD-HHMM.sql.gz
# Restore:  gunzip -c backups/<file>.sql.gz | docker compose exec -T db psql -U element element_quest
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
out="backups/element-quest-$(date +%Y-%m-%d-%H%M).sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$out"
echo "Saved $out"
