#!/bin/bash
# Setup script for backend

echo "🚀 Setting up DnDBug Python backend..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or later."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
python3 -m pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
python3 -m pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the server:"
echo "  source venv/bin/activate"
echo "  python backend/run.py"
echo ""
echo "Or use the run script:"
echo "  ./backend/run.sh"
echo ""

