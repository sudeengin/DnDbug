#!/bin/bash

# Kill any existing processes on the ports we need
echo "🔄 Stopping existing servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

# Start the backend server
echo "🚀 Starting backend server on port 3000..."
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start the frontend server
echo "🎨 Starting frontend server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "📡 Backend API: http://localhost:3000"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for user to stop
wait
