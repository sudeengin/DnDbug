# DnDBug Python Backend

This is the Python/FastAPI backend for the DnDBug application, converted from the original Node.js/Express backend.

## Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── requirements.txt        # Python dependencies
├── models/                 # Pydantic models (converted from TypeScript types)
│   ├── __init__.py
│   ├── macro_chain.py     # Macro chain, scenes, characters, context models
│   ├── srd_2014.py        # SRD 2014 character models
│   └── project.py          # Project model
├── routers/               # API route handlers
│   ├── __init__.py
│   ├── projects.py        # Projects CRUD endpoints
│   └── context.py         # Context management endpoints
├── services/              # Business logic
│   ├── storage_service.py  # File-based storage (chains, contexts, projects)
│   ├── context_service.py # Session context management
│   └── lock_service.py    # Lock/unlock functionality
└── utils/                 # Utilities
    ├── logger.py          # Logging utility
    └── creativity_tracker.py # Creativity tracking for AI generation
```

## Setup

1. **Quick setup (recommended):**
   ```bash
   cd backend
   ./setup.sh
   ```
   
   Or manually:
   ```bash
   cd backend
   
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   source venv/bin/activate
   
   # Install dependencies
   python3 -m pip install -r requirements.txt
   ```
   
   **Note:** On macOS, use `python3 -m pip` instead of `pip`.

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Run the server:**
   ```bash
   # Activate virtual environment first
   source venv/bin/activate
   
   # Option 1: Use the run script
   ./backend/run.sh
   
   # Option 2: Use uvicorn directly
   python3 -m uvicorn backend.main:app --reload --port 3000
   
   # Option 3: Use the Python run script
   python3 backend/run.py
   ```

## API Compatibility

The Python backend maintains **exact API compatibility** with the Express version:

- Same endpoint paths (`/api/...`)
- Same request/response formats (`{ ok: true, data: ... }` or `{ error: ... }`)
- Same status codes
- Same error messages

This ensures the React frontend works without any changes.

## Completed Endpoints

✅ **Projects:**
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/{id}` - Get project
- `DELETE /api/projects/{id}` - Delete project

✅ **Context:**
- `POST /api/context/append` - Append context block
- `GET /api/context/get` - Get session context
- `GET /api/context/health` - Context health check
- `POST /api/context/clear` - Clear context
- `POST /api/context/lock` - Lock/unlock context block

✅ **Health:**
- `GET /api/health` - Health check

## Remaining Endpoints to Implement

The following endpoints need to be implemented. They follow the same patterns as the completed ones:

### Chains
- `POST /api/generate_chain` - Generate macro chain
- `POST /api/generate_next_scene` - Generate next scene
- `POST /api/update_chain` - Update chain with edits
- `GET /api/chain/get` - Get chain
- `POST /api/chain/lock` - Lock chain
- `POST /api/chain/unlock` - Unlock chain

### Scenes
- `POST /api/generate_detail` - Generate scene detail
- `POST /api/scene/update` - Update scene
- `POST /api/scene/delete` - Delete scene
- `POST /api/scene/unlock` - Unlock scene

### Characters
- `POST /api/characters/generate` - Generate characters
- `GET /api/characters/list` - List characters
- `POST /api/characters/upsert` - Upsert character
- `POST /api/characters/lock` - Lock characters
- `POST /api/characters/delete` - Delete character
- `POST /api/characters/regenerate` - Regenerate character field

### SRD 2014 Characters
- `POST /api/characters/srd2014/save` - Save SRD character
- `GET /api/characters/srd2014/list` - List SRD characters
- `POST /api/characters/srd2014/delete` - Delete SRD character

### Background
- `POST /api/generate_background` - Generate story background
- `POST /api/background/lock` - Lock background (uses context/lock)

### Other
- `POST /api/apply_edit` - Apply edit delta
- `POST /api/propagate` - Propagate changes

## Implementation Guide

To implement the remaining endpoints:

1. **Create router file** in `backend/routers/` (e.g., `chains.py`, `scenes.py`, etc.)

2. **Follow the pattern:**
   ```python
   from fastapi import APIRouter, HTTPException
   from backend.services.storage_service import ...
   from backend.services.context_service import ...
   from backend.utils.logger import logger
   
   router = APIRouter(prefix="/api/...", tags=["..."])
   log = logger['...']
   
   @router.post("/endpoint")
   async def endpoint_handler(...):
       # Implementation
       return {"ok": True, "data": ...}
   ```

3. **Import OpenAI client:**
   ```python
   from openai import OpenAI
   from backend.config import settings
   
   client = OpenAI(api_key=settings.openai_api_key)
   ```

4. **Use existing services:**
   - `storage_service.py` for file operations
   - `context_service.py` for session context
   - `lock_service.py` for locking
   - `logger` for logging

5. **Register router in `main.py`:**
   ```python
   from backend.routers import chains
   app.include_router(chains.router)
   ```

## Data Storage

The backend uses the same `.data/` directory structure as the Express version:
- `.data/chains.json` - Macro chains
- `.data/context.json` - Session contexts
- `projects.json` - Projects (at root)

This ensures compatibility and easy migration.

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for AI generation
- `PORT` - Server port (default: 3000)
- `ENVIRONMENT` - Environment (development/production)

## Testing

Test endpoints using curl or the FastAPI docs at `http://localhost:3000/docs`:

```bash
# Health check
curl http://localhost:3000/api/health

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Project"}'
```

## Migration Notes

- All TypeScript interfaces have been converted to Pydantic models
- File-based storage maintains the same JSON structure
- Session context management works identically
- Lock service provides the same functionality
- Logger provides similar emoji-based logging

## Next Steps

1. Implement remaining routers (chains, scenes, characters, etc.)
2. Add OpenAI integration for AI generation endpoints
3. Test all endpoints against the React frontend
4. Add error handling and validation
5. Consider adding database migration path (optional)

