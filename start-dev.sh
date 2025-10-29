#!/bin/bash

# Development startup script with log rotation support

# Load log rotation module path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Kill any existing processes on the ports we need
echo "🔄 Stopping existing servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

# Function to rotate log if it exceeds size
rotate_log() {
    local logfile="$1"
    local max_size=$((10 * 1024 * 1024)) # 10MB
    
    if [ -f "$logfile" ]; then
        size=$(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null || echo 0)
        if [ "$size" -gt "$max_size" ]; then
            timestamp=$(date +"%Y%m%d_%H%M%S")
            mv "$logfile" "${logfile}.${timestamp}"
            echo "📦 Rotated log: $logfile → ${logfile}.${timestamp}"
        fi
    fi
}

# Rotate logs before starting (check both root and logs directory)
echo "📦 Checking log rotation..."
rotate_log "server.log"
rotate_log "vite.log"
rotate_log "$LOGS_DIR/server.log"
rotate_log "$LOGS_DIR/vite.log"

# Clean up old rotated logs (keep last 5)
cleanup_old_logs() {
    local logname="$1"
    local pattern="${logname}.*"
    local all_files=($(ls -t ${pattern} 2>/dev/null))
    
    if [ ${#all_files[@]} -gt 5 ]; then
        for file in "${all_files[@]:5}"; do
            rm -f "$file"
            echo "🗑️  Removed old log: $file"
        done
    fi
}

cleanup_old_logs "server.log"
cleanup_old_logs "vite.log"
cleanup_old_logs "$LOGS_DIR/server.log"
cleanup_old_logs "$LOGS_DIR/vite.log"

# Start the backend server with log rotation
echo "🚀 Starting backend server on port 3000..."
node server.js > "$LOGS_DIR/server.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start the frontend server with log rotation
echo "🎨 Starting frontend server on port 5173..."
npm run dev > "$LOGS_DIR/vite.log" 2>&1 &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "📡 Backend API: http://localhost:3000"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "📋 Logs:"
echo "   Backend: $LOGS_DIR/server.log"
echo "   Frontend: $LOGS_DIR/vite.log"
echo ""
echo "💡 Log rotation: Logs automatically rotate at 10MB, keeping 5 rotated files"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    # Rotate logs on shutdown
    rotate_log "server.log"
    rotate_log "vite.log"
    rotate_log "$LOGS_DIR/server.log"
    rotate_log "$LOGS_DIR/vite.log"
    
    # Kill rotation monitor
    kill $ROTATION_PID 2>/dev/null || true
    
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Function to periodically check and rotate logs
log_rotation_monitor() {
    while true; do
        sleep 3600  # Check every hour
        rotate_log "$LOGS_DIR/server.log"
        rotate_log "$LOGS_DIR/vite.log"
        cleanup_old_logs "$LOGS_DIR/server.log"
        cleanup_old_logs "$LOGS_DIR/vite.log"
    done
}

# Start log rotation monitor in background
log_rotation_monitor &
ROTATION_PID=$!

# Wait for user to stop
wait
