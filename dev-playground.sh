#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AXUM_DIR="$SCRIPT_DIR/js_go_rust_playground/code-playground"
SECRET="test-secret"

# Kill anything already on these ports
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true

# Start Axum in background
echo "Starting Axum service on :3001..."
PLAYGROUND_SECRET=$SECRET \
ALLOWED_ORIGINS=http://localhost:3002 \
PORT=3001 \
RUST_LOG=code_playground=info \
  "$AXUM_DIR/target/debug/code-playground" &
AXUM_PID=$!

# Kill Axum when this script exits
trap "kill $AXUM_PID 2>/dev/null" EXIT

echo "Starting Next.js on :3002..."
FORCE_REAL_BACKEND=true \
PLAYGROUND_SECRET=$SECRET \
PLAYGROUND_AXUM_URL=http://localhost:3001 \
NEXT_PUBLIC_SITE_URL=http://localhost:3002 \
  yarn --cwd "$SCRIPT_DIR" dev --port 3002
