#!/bin/bash
# One-time setup for macOS (also works on Linux/WSL).
# Creates a Python virtual environment, installs backend deps and frontend deps.
#
# Prerequisites (install via Homebrew first):
#   brew install node python@3.11
#
# Usage:
#   ./setup_macos.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> Face Identification System setup"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Run: brew install python@3.11" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found. Run: brew install node" >&2
  exit 1
fi

# ---------- Backend ----------
echo "==> Setting up backend (Python virtual environment)"
cd "$ROOT_DIR/backend"
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
deactivate

# ---------- Frontend ----------
echo "==> Setting up frontend (npm dependencies)"
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "node_modules already present, skipping install (run 'npm install' to refresh)"
fi

echo
echo "Setup complete!"
echo
echo "Next steps:"
echo "  1. Start the app:   ./start.sh"
echo "  2. Open the UI:     http://localhost:5173"
echo "  3. Log in:          admin / admin123"
echo "  4. Or open in VS Code:  code $ROOT_DIR"
