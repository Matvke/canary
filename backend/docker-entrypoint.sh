#!/bin/sh
set -eu

DB_PATH="/data/factory_reports.db"
SEED_DB_PATH="/app/app/factory_reports.db"

if [ ! -f "$DB_PATH" ] && [ -f "$SEED_DB_PATH" ]; then
  cp "$SEED_DB_PATH" "$DB_PATH"
fi

exec "$@"
