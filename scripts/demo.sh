#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo ".env created with defaults. Edit it if needed, then re-run."
fi

echo "Building and starting LMS demo..."
docker compose up -d --build

echo ""
APP_PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2 | tr -d '"' | tr -d "'" 2>/dev/null || echo 3000)
PGADMIN_PORT=$(grep -E '^PGADMIN_PORT=' .env | cut -d= -f2 | tr -d '"' | tr -d "'" 2>/dev/null || echo 5050)

echo "Services are starting:"
echo "  App:     http://localhost:${APP_PORT}"
echo "  pgAdmin: http://localhost:${PGADMIN_PORT}  (admin@lms.edu.mv / admin)"
echo ""
echo "The app runs migrations and seeds demo data on first boot."
echo "Follow progress with:  docker compose logs -f app"
