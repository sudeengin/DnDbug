"""
Project model
"""
from pydantic import BaseModel


class Project(BaseModel):
    """Project model"""
    id: str
    title: str
    createdAt: str
    updatedAt: str

