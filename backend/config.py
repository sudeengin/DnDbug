"""
Configuration management for the backend
"""
import os
from pathlib import Path
from typing import Optional, List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env files (check both .env.local and .env, matching Express server behavior)
# Express server uses .env.local, so we check that first
env_file = Path(__file__).parent.parent / ".env.local"
if not env_file.exists():
    env_file = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_file)


class Settings(BaseSettings):
    """Application settings"""
    
    # OpenAI Configuration
    openai_api_key: str = ""
    
    # Server Configuration
    port: int = 3000
    
    # Environment
    environment: str = "development"
    
    # Data Directory (relative to project root)
    data_dir: str = ".data"
    
    # CORS Origins
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        # Check both .env.local (Express default) and .env
        env_file = [".env.local", ".env"]
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()

# Get project root (parent of backend directory)
project_root = Path(__file__).parent.parent
data_dir_path = project_root / settings.data_dir

# Ensure data directory exists
data_dir_path.mkdir(parents=True, exist_ok=True)

# Update settings with absolute path
settings.data_dir = str(data_dir_path)

