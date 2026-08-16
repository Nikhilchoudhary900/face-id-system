#!/bin/bash
# Startup script for the Face Identification System.
# Starts the backend (FastAPI) and frontend (Vite) development servers.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

cd "$ROOT_DIR/backend"
if [ -d "venv" ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
fi
python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &

FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT

echo "Face Identification System running:"
echo "  Backend API : http://localhost:$BACKEND_PORT"
echo "  Frontend    : http://localhost:$FRONTEND_PORT"
wait
