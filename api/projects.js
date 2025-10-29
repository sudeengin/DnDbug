import fs from 'fs';
import path from 'path';
import logger from "./lib/logger.js";

const log = logger.api;

// File-based storage for projects
const PROJECTS_FILE = path.join(process.cwd(), 'projects.json');

// Helper function to load projects from file
function loadProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
      const projectsArray = JSON.parse(data);
      return new Map(projectsArray.map(p => [p.id, p]));
    }
  } catch (error) {
    log.error('Error loading projects:', error);
  }
  return new Map();
}

// Helper function to save projects to file
function saveProjects(projectsMap) {
  try {
    const projectsArray = Array.from(projectsMap.values());
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projectsArray, null, 2));
  } catch (error) {
    log.error('Error saving projects:', error);
  }
}

// Load projects from file on startup
let projects = loadProjects();

// Helper function to create a new project
function createProject(title) {
  const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const project = {
    id: projectId,
    title: title.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.set(projectId, project);
  saveProjects(projects); // Persist to file
  return project;
}

// Helper function to get a project by ID
function getProject(projectId) {
  return projects.get(projectId);
}

// Helper function to list all projects
function listProjects() {
  return Array.from(projects.values());
}

// Helper function to update a project
function updateProject(projectId, updates) {
  const project = projects.get(projectId);
  if (project) {
    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    projects.set(projectId, updatedProject);
    saveProjects(projects); // Persist to file
    return updatedProject;
  }
  return null;
}

// Helper function to delete a project
function deleteProject(projectId) {
  const project = projects.get(projectId);
  if (project) {
    projects.delete(projectId);
    saveProjects(projects); // Persist to file
    return project;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const { method } = req;
    const url = req.url || '';

    if (method === 'POST') {
      // POST /projects - Create a new project
      const { title } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ 
          error: 'title is required and must be a non-empty string' 
        });
      }

      const project = createProject(title);

      log.info('Project created:', {
        id: project.id,
        title: project.title,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: project 
      });

    } else if (method === 'GET' && url.includes('/') && url.split('/').length > 1) {
      // GET /projects/{id} - Get a specific project
      const projectId = url.split('/').pop();
      
      if (!projectId) {
        return res.status(400).json({ 
          error: 'projectId is required' 
        });
      }

      const project = getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ 
          error: 'Project not found' 
        });
      }

      log.info('Project retrieved:', {
        id: project.id,
        title: project.title,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: project 
      });

    } else if (method === 'GET') {
      // GET /projects - List all projects
      const allProjects = listProjects();

      log.info('Projects listed:', {
        count: allProjects.length,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: allProjects 
      });

    } else if (method === 'DELETE' && url.includes('/')) {
      // DELETE /projects/{id} - Delete a specific project
      const projectId = url.split('/').pop();
      
      if (!projectId) {
        return res.status(400).json({ 
          error: 'projectId is required' 
        });
      }

      const deletedProject = deleteProject(projectId);
      
      if (!deletedProject) {
        return res.status(404).json({ 
          error: 'Project not found' 
        });
      }

      log.info('Project deleted:', {
        id: deletedProject.id,
        title: deletedProject.title,
        timestamp: Date.now()
      });

      res.status(200).json({ 
        ok: true, 
        data: { message: 'Project deleted successfully', project: deletedProject }
      });

    } else {
      res.status(405).json({ 
        error: 'Method not allowed' 
      });
    }

  } catch (error) {
    log.error('Error in projects handler:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}

// Export helper functions for use in other modules
export { createProject, getProject, listProjects, updateProject, deleteProject };
