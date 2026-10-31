#!/usr/bin/env bash
# Pathwise Dev Runner

echo "=========================================="
echo " Starting Pathwise Learning Platform      "
echo "=========================================="

cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM EXIT

# Start backend
echo "-> Starting Backend API on http://localhost:8000..."
(cd backend && .venv39/bin/uvicorn app.main:app --reload --port 8000) &

# Wait 2 seconds for backend to initialize
sleep 2

# Start frontend
echo "-> Starting Next.js Frontend on http://localhost:3000..."
(cd frontend && npm run dev) &

# Keep script running
wait
