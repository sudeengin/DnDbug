#!/bin/bash

# Log Rotation Setup Script
# Sets up log rotation for server.log and vite.log

LOG_DIR="logs"
MAX_SIZE="10M"
KEEP_LOGS=5

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "📦 Log rotation setup complete!"
echo "   Log directory: $LOG_DIR"
echo "   Max file size: $MAX_SIZE"
echo "   Files to keep: $KEEP_LOGS"
echo ""
echo "Note: Log rotation is handled by Node.js script (api/lib/logRotator.js)"
echo "      This script creates the logs directory structure."

