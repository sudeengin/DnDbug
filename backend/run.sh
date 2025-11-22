#!/bin/bash
# Run script for backend (with virtual environment)

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   cd backend && ./setup.sh"
    exit 1
fi

# Activate virtual environment and run
source venv/bin/activate
python3 backend/run.py

