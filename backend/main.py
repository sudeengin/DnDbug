"""
FastAPI main application
Converted from server.js
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.config import settings
from backend.routers import projects, context, characters
from backend.utils.logger import logger

log = logger['server']

# Create FastAPI app
app = FastAPI(
    title="DnDBug API Server",
    description="Backend API for DnDBug application",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming POST/PUT/DELETE requests"""
    if request.method in ["POST", "PUT", "DELETE"]:
        body = await request.body()
        body_preview = body[:150].decode('utf-8', errors='ignore') if body else ''
        log.info(f"📨 {request.method} {request.url.path} - Body: {body_preview}")
    
    response = await call_next(request)
    return response


# Include routers
app.include_router(projects.router)
app.include_router(context.router)
app.include_router(characters.router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "message": "DnDBug API Server",
        "status": "running",
        "frontend": "http://localhost:5173",
        "endpoints": [
            "GET /api/health",
            "POST /api/projects",
            "GET /api/projects",
            "GET /api/projects/{id}",
            "DELETE /api/projects/{id}",
            "POST /api/generate_chain",
            "POST /api/generate_next_scene",
            "POST /api/update_chain",
            "POST /api/generate_detail",
            "POST /api/apply_edit",
            "POST /api/propagate",
            "POST /api/generate_background",
            "POST /api/context/append",
            "GET /api/context/get",
            "POST /api/context/clear",
            "POST /api/context/lock",
            "POST /api/chain/lock",
            "POST /api/chain/unlock",
            "POST /api/scene/unlock",
            "POST /api/scene/update",
            "POST /api/scene/delete",
            "POST /api/characters/generate",
            "GET /api/characters/list",
            "POST /api/characters/lock",
            "POST /api/characters/upsert",
            "POST /api/characters/regenerate",
            "POST /api/characters/srd2014/save",
            "GET /api/characters/srd2014/list",
            "POST /api/characters/srd2014/delete",
            "POST /api/background/lock",
        ]
    }


# Health check endpoint
@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler"""
    error_message = str(exc)
    error_stack = str(exc.__traceback__) if hasattr(exc, '__traceback__') else ''
    
    # Detect module resolution errors
    is_module_error = any(keyword in error_message for keyword in [
        'Cannot find module', 'ModuleNotFoundError', 'ImportError'
    ])
    
    log.error('\n🚨 SERVER ERROR DETECTED 🚨')
    log.error('═' * 80)
    log.error(f'❌ Error: {error_message}')
    log.error(f'📍 URL: {request.method} {request.url.path}')
    log.error(f'⏰ Timestamp: {datetime.now().isoformat()}')
    
    if is_module_error:
        log.error('🔍 MODULE RESOLUTION ERROR DETECTED:')
        log.error('   This appears to be an import/module path issue')
        log.error('   Check file paths and import statements')
    
    log.error('\n📋 Full Error Stack:')
    log.error(error_stack)
    log.error('═' * 80)
    
    status_code = 500
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": error_message,
            "type": "MODULE_RESOLUTION_ERROR" if is_module_error else "SERVER_ERROR",
            "timestamp": datetime.now().isoformat()
        }
    )


# Handle 404s
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Handle 404 errors"""
    log.warn(f"⚠️  404 Not Found: {request.method} {request.url.path}")
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint not found"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True
    )

