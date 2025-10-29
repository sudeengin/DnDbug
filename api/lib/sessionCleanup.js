/**
 * Session Cleanup Utility
 * Provides functions to clean up old sessions and manage context.json size
 */

import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const log = logger.storage;

const DATA_DIR = path.join(process.cwd(), '.data');
const CONTEXT_FILE = path.join(DATA_DIR, 'context.json');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

// Configuration
const MAX_SESSION_AGE_DAYS = 30; // Archive sessions older than 30 days
const MAX_FILE_SIZE_MB = 10; // Archive if file exceeds 10MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Ensure archive directory exists
 */
async function ensureArchiveDir() {
  try {
    await fs.access(ARCHIVE_DIR);
  } catch {
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    log.info('Created archive directory', { path: ARCHIVE_DIR });
  }
}

/**
 * Archive old sessions
 */
export async function archiveOldSessions() {
  try {
    await ensureArchiveDir();
    
    const contextData = await fs.readFile(CONTEXT_FILE, 'utf8');
    const contexts = JSON.parse(contextData);
    
    const now = Date.now();
    const maxAge = MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    const activeContexts = {};
    const archivedContexts = {};
    let archivedCount = 0;
    
    for (const [sessionId, session] of Object.entries(contexts)) {
      const lastUpdated = new Date(session.updatedAt || session.createdAt || 0).getTime();
      const age = now - lastUpdated;
      
      if (age > maxAge) {
        archivedContexts[sessionId] = session;
        archivedCount++;
      } else {
        activeContexts[sessionId] = session;
      }
    }
    
    if (archivedCount > 0) {
      const archiveTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const archiveFile = path.join(ARCHIVE_DIR, `context-${archiveTimestamp}.json`);
      
      await fs.writeFile(archiveFile, JSON.stringify(archivedContexts, null, 2));
      
      await fs.writeFile(CONTEXT_FILE, JSON.stringify(activeContexts, null, 2));
      
      log.info('Archived old sessions', {
        archivedCount,
        activeCount: Object.keys(activeContexts).length,
        archiveFile
      });
      
      return {
        archived: archivedCount,
        active: Object.keys(activeContexts).length,
        archiveFile
      };
    }
    
    return {
      archived: 0,
      active: Object.keys(activeContexts).length,
      archiveFile: null
    };
    
  } catch (error) {
    log.error('Error archiving old sessions:', error);
    throw error;
  }
}

/**
 * Check if context.json needs cleanup
 */
export async function checkContextSize() {
  try {
    const stats = await fs.stat(CONTEXT_FILE);
    const sizeMB = stats.size / (1024 * 1024);
    
    return {
      size: stats.size,
      sizeMB: sizeMB.toFixed(2),
      needsCleanup: stats.size > MAX_FILE_SIZE_BYTES
    };
  } catch (error) {
    log.error('Error checking context size:', error);
    return {
      size: 0,
      sizeMB: '0',
      needsCleanup: false
    };
  }
}

/**
 * Get session count and statistics
 */
export async function getSessionStats() {
  try {
    const contextData = await fs.readFile(CONTEXT_FILE, 'utf8');
    const contexts = JSON.parse(contextData);
    
    const now = Date.now();
    const sessions = Object.values(contexts);
    
    let activeSessions = 0;
    let oldSessions = 0;
    
    sessions.forEach(session => {
      const lastUpdated = new Date(session.updatedAt || session.createdAt || 0).getTime();
      const ageDays = (now - lastUpdated) / (24 * 60 * 60 * 1000);
      
      if (ageDays > MAX_SESSION_AGE_DAYS) {
        oldSessions++;
      } else {
        activeSessions++;
      }
    });
    
    return {
      total: sessions.length,
      active: activeSessions,
      old: oldSessions,
      maxAgeDays: MAX_SESSION_AGE_DAYS
    };
  } catch (error) {
    log.error('Error getting session stats:', error);
    return {
      total: 0,
      active: 0,
      old: 0,
      maxAgeDays: MAX_SESSION_AGE_DAYS
    };
  }
}

/**
 * Cleanup function to be called periodically or manually
 */
export async function cleanupSessions(force = false) {
  try {
    const sizeCheck = await checkContextSize();
    const stats = await getSessionStats();
    
    log.info('Session cleanup check', {
      fileSizeMB: sizeCheck.sizeMB,
      needsCleanup: sizeCheck.needsCleanup,
      totalSessions: stats.total,
      oldSessions: stats.old
    });
    
    if (force || sizeCheck.needsCleanup || stats.old > 0) {
      const result = await archiveOldSessions();
      return {
        cleaned: true,
        ...result,
        ...sizeCheck,
        ...stats
      };
    }
    
    return {
      cleaned: false,
      ...sizeCheck,
      ...stats
    };
  } catch (error) {
    log.error('Error in cleanupSessions:', error);
    throw error;
  }
}

