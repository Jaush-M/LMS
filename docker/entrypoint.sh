#!/bin/sh
set -e

export PATH="/app/node_modules/.bin:$PATH"

echo "Running database migrations..."
MAX_RETRIES=30
RETRY=0

until prisma migrate deploy 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Migrations failed after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "Attempt $RETRY/$MAX_RETRIES failed — retrying in 2s..."
  sleep 2
done

echo "Migrations complete."

if [ "${RUN_DEMO_SEED:-false}" = "true" ]; then
  echo "Checking if demo data already exists..."
  if bun docker/check-empty-db.ts 2>/dev/null; then
    echo "Running demo seed..."
    bun prisma/seed.demo.ts
    echo "Demo seed complete."
  else
    echo "Database already seeded — skipping."
  fi
fi

echo "Starting application..."
exec "$@"
