"""
Projects router
Converted from api/projects.js
"""
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
import json
import random
import string
from datetime import datetime
from pathlib import Path
import aiofiles
from backend.models.project import Project
from backend.utils.logger import logger

router = APIRouter(prefix="/api/projects", tags=["projects"])
log = logger['api']

PROJECTS_FILE = Path("projects.json")


async def load_projects() -> dict:
    """Load projects from file"""
    try:
        if PROJECTS_FILE.exists():
            async with aiofiles.open(PROJECTS_FILE, 'r') as f:
                data = await f.read()
                projects_array = json.loads(data)
                return {p['id']: p for p in projects_array}
    except Exception as error:
        log.error('Error loading projects:', error)
    return {}


async def save_projects(projects: dict):
    """Save projects to file"""
    try:
        projects_array = list(projects.values())
        async with aiofiles.open(PROJECTS_FILE, 'w') as f:
            await f.write(json.dumps(projects_array, indent=2))
    except Exception as error:
        log.error('Error saving projects:', error)


class CreateProjectRequest(BaseModel):
    title: str


@router.post("")
async def create_project(request: CreateProjectRequest):
    """Create a new project"""
    title = request.title
    """Create a new project"""
    if not title or not isinstance(title, str) or not title.strip():
        raise HTTPException(status_code=400, detail="title is required and must be a non-empty string")
    
    project_id = f"project_{int(datetime.now().timestamp() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"
    project = {
        "id": project_id,
        "title": title.strip(),
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    projects = await load_projects()
    projects[project_id] = project
    await save_projects(projects)
    
    log.info('Project created:', {
        'id': project['id'],
        'title': project['title'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": project}


@router.get("")
async def list_projects():
    """List all projects"""
    projects = await load_projects()
    all_projects = list(projects.values())
    
    log.info('Projects listed:', {
        'count': len(all_projects),
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": all_projects}


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get a specific project"""
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")
    
    projects = await load_projects()
    project = projects.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    log.info('Project retrieved:', {
        'id': project['id'],
        'title': project['title'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": project}


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a specific project"""
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")
    
    projects = await load_projects()
    deleted_project = projects.pop(project_id, None)
    
    if not deleted_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await save_projects(projects)
    
    log.info('Project deleted:', {
        'id': deleted_project['id'],
        'title': deleted_project['title'],
        'timestamp': int(datetime.now().timestamp() * 1000)
    })
    
    return {"ok": True, "data": {"message": "Project deleted successfully", "project": deleted_project}}

