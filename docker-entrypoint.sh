#!/bin/sh
set -e
if [ ! -f /data/.initialized ]; then
  echo "[init] Copying pre-seeded database..."
  cp /app/seed.db "${DB_PATH:-/data/app.db}"
  touch /data/.initialized
fi
exec "$@"
