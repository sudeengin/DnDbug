/**
 * Log Rotation Utility
 * Automatically rotates log files to prevent disk space issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOG_DIR = path.join(process.cwd(), 'logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB per log file
const MAX_LOG_FILES = 5; // Keep 5 rotated files
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

/**
 * Ensure logs directory exists
 */
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get all rotated log files for a given log name
 */
function getRotatedLogs(logName) {
  const files = fs.readdirSync(LOG_DIR).filter(file => {
    return file.startsWith(logName) && file !== logName;
  });
  
  // Sort by timestamp (newest first)
  return files.sort((a, b) => {
    const timestampA = a.match(/\d{8}_\d{6}/);
    const timestampB = b.match(/\d{8}_\d{6}/);
    if (!timestampA || !timestampB) return 0;
    return timestampB.localeCompare(timestampA);
  });
}

/**
 * Get total size of all log files for a given log name
 */
function getTotalLogSize(logName) {
  const files = [logName, ...getRotatedLogs(logName)];
  let totalSize = 0;
  
  files.forEach(file => {
    const filePath = path.join(LOG_DIR, file);
    if (fs.existsSync(filePath)) {
      try {
        totalSize += fs.statSync(filePath).size;
      } catch (e) {
        // Ignore errors reading stats
      }
    }
  });
  
  return totalSize;
}

/**
 * Clean up old log files
 */
function cleanupOldLogs(logName) {
  const rotatedLogs = getRotatedLogs(logName);
  
  // Remove files exceeding MAX_LOG_FILES
  if (rotatedLogs.length >= MAX_LOG_FILES) {
    const toRemove = rotatedLogs.slice(MAX_LOG_FILES - 1);
    toRemove.forEach(file => {
      try {
        fs.unlinkSync(path.join(LOG_DIR, file));
      } catch (e) {
        // Ignore errors
      }
    });
  }
  
  // Check total size and remove oldest if needed
  if (getTotalLogSize(logName) > MAX_TOTAL_SIZE) {
    const rotatedLogs = getRotatedLogs(logName);
    while (getTotalLogSize(logName) > MAX_TOTAL_SIZE && rotatedLogs.length > 0) {
      const oldest = rotatedLogs.pop();
      try {
        fs.unlinkSync(path.join(LOG_DIR, oldest));
      } catch (e) {
        break;
      }
    }
  }
}

/**
 * Rotate a log file if it exceeds MAX_LOG_SIZE
 */
export function rotateLog(logName) {
  ensureLogDir();
  
  const logPath = path.join(LOG_DIR, logName);
  
  // Check if log file exists and its size
  if (!fs.existsSync(logPath)) {
    return;
  }
  
  try {
    const stats = fs.statSync(logPath);
    
    // Rotate if file exceeds max size
    if (stats.size >= MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .substring(0, 19); // YYYY-MM-DD_HH-MM-SS
      
      const rotatedName = `${logName}.${timestamp}`;
      const rotatedPath = path.join(LOG_DIR, rotatedName);
      
      // Move current log to rotated file
      fs.renameSync(logPath, rotatedPath);
      
      // Clean up old logs
      cleanupOldLogs(logName);
      
      console.log(`📦 Log rotated: ${logName} → ${rotatedName}`);
    }
  } catch (error) {
    // Ignore errors during rotation
    console.error(`Error rotating log ${logName}:`, error.message);
  }
}

/**
 * Create a rotating write stream for a log file
 */
export function createRotatingStream(logName) {
  ensureLogDir();
  
  // Rotate before creating new stream
  rotateLog(logName);
  
  const logPath = path.join(LOG_DIR, logName);
  
  // Create write stream with auto-flush
  const stream = fs.createWriteStream(logPath, { 
    flags: 'a', // Append mode
    encoding: 'utf8',
    autoClose: true 
  });
  
  // Rotate periodically (every hour) and on size check
  const rotationInterval = setInterval(() => {
    rotateLog(logName);
    
    // Reopen stream if it was closed during rotation
    if (stream.destroyed || stream.closed) {
      const newStream = createRotatingStream(logName);
      // Note: This won't replace the existing stream reference
      // The caller should handle reconnection if needed
    }
  }, 3600000); // 1 hour
  
  // Check size periodically (every 5 minutes)
  const sizeCheckInterval = setInterval(() => {
    rotateLog(logName);
  }, 300000); // 5 minutes
  
  // Store interval references (cleanup on close)
  stream.on('close', () => {
    clearInterval(rotationInterval);
    clearInterval(sizeCheckInterval);
  });
  
  return stream;
}

/**
 * Initialize log rotation for server.log
 */
export function initializeServerLogRotation() {
  ensureLogDir();
  
  // Rotate on startup
  rotateLog('server.log');
  
  // Set up periodic rotation
  setInterval(() => {
    rotateLog('server.log');
  }, 3600000); // Check every hour
}

/**
 * Initialize log rotation for vite.log
 */
export function initializeViteLogRotation() {
  ensureLogDir();
  
  // Rotate on startup
  rotateLog('vite.log');
  
  // Set up periodic rotation
  setInterval(() => {
    rotateLog('vite.log');
  }, 3600000); // Check every hour
}

