#!/usr/bin/env python3
"""
Run script for the backend server
"""
import uvicorn
from pathlib import Path
import sys

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=3000,
        reload=True,
        log_level="info"
    )

