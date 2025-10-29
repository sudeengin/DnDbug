#!/usr/bin/env node
/**
 * Automated script to migrate console statements to logger across the project
 * Run with: node migrate-to-logger.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File patterns and their corresponding logger components
const FILE_MAPPINGS = {
  'generate_chain': 'macroChain',
  'update_chain': 'macroChain',
  'generate_background': 'background',
  'background/': 'background',
  'generate_detail': 'scene',
  'scene/': 'scene',
  'generate_next_scene': 'scene',
  'characters/': 'character',
  'context/': 'context',
  'storage': 'storage',
  'validation': 'validation',
  'lock': 'lock',
  'propagate': 'api',
  'projects': 'api',
  'apply_edit': 'api',
  'promptContext': 'prompt',
  'invalidation': 'api'
};

// Determine logger component from file path
function getLoggerComponent(filePath) {
  for (const [pattern, component] of Object.entries(FILE_MAPPINGS)) {
    if (filePath.includes(pattern)) {
      return component;
    }
  }
  return 'api'; // default
}

// Check if file already has logger imported
async function hasLoggerImport(content) {
  return content.includes("from './lib/logger.js'") || 
         content.includes('from "../lib/logger.js"') ||
         content.includes('from "../../lib/logger.js"');
}

// Add logger import to file
function addLoggerImport(content, filePath, component) {
  // Determine relative path to logger
  const depth = filePath.split('/').filter(p => p === 'api').length + 
                filePath.split('/').filter((_, i, arr) => i > arr.indexOf('api') && i < arr.length - 1).length;
  const relativePath = '../'.repeat(depth) + 'lib/logger.js';
  
  // Find last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  // Add logger import after last import
  const loggerImport = `import logger from '${relativePath}';\n\nconst log = logger.${component};`;
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, loggerImport);
  } else {
    lines.unshift(loggerImport);
  }
  
  return lines.join('\n');
}

// Replace console statements with logger
function replaceConsoleStatements(content) {
  let updated = content;
  
  // Replace console.error with log.error
  updated = updated.replace(/console\.error\(/g, 'log.error(');
  
  // Replace console.warn with log.warn
  updated = updated.replace(/console\.warn\(/g, 'log.warn(');
  
  // Replace console.log with log.info (or log.debug for verbose ones)
  // Keep the ones that look like debug messages as log.debug
  updated = updated.replace(/console\.log\('===.*?==='\)/g, (match) => {
    return match.replace('console.log', 'log.debug');
  });
  
  updated = updated.replace(/console\.log\('---.*?---'\)/g, (match) => {
    return match.replace('console.log', 'log.debug');
  });
  
  // All other console.log become log.info
  updated = updated.replace(/console\.log\(/g, 'log.info(');
  
  // Replace console.info with log.info
  updated = updated.replace(/console\.info\(/g, 'log.info(');
  
  return updated;
}

// Process a single file
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Skip if no console statements
    if (!content.match(/console\.(log|warn|error|info)\(/)) {
      return { file: filePath, status: 'skipped', reason: 'No console statements' };
    }
    
    // Skip if already has logger
    if (await hasLoggerImport(content)) {
      // Just replace console statements
      const updated = replaceConsoleStatements(content);
      if (updated !== content) {
        await fs.writeFile(filePath, updated, 'utf8');
        return { file: filePath, status: 'updated', reason: 'Console statements replaced' };
      }
      return { file: filePath, status: 'skipped', reason: 'Already using logger' };
    }
    
    // Add logger import
    const component = getLoggerComponent(filePath);
    let updated = addLoggerImport(content, filePath, component);
    
    // Replace console statements
    updated = replaceConsoleStatements(updated);
    
    // Write updated file
    await fs.writeFile(filePath, updated, 'utf8');
    
    return { file: filePath, status: 'migrated', component, reason: 'Logger added and console replaced' };
  } catch (error) {
    return { file: filePath, status: 'error', reason: error.message };
  }
}

// Find all API files
async function findApiFiles(dir) {
  const files = [];
  
  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        // Skip logger.js itself and node_modules
        if (!fullPath.includes('node_modules') && !fullPath.endsWith('logger.js')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await walk(dir);
  return files;
}

// Main execution
async function main() {
  console.log('🔍 Finding API files...\n');
  
  const apiDir = path.join(__dirname, 'api');
  const files = await findApiFiles(apiDir);
  
  console.log(`Found ${files.length} files to check\n`);
  console.log('📝 Processing files...\n');
  
  const results = [];
  for (const file of files) {
    const result = await processFile(file);
    results.push(result);
    
    const icon = result.status === 'migrated' ? '✅' :
                 result.status === 'updated' ? '🔄' :
                 result.status === 'error' ? '❌' : '⏭️';
    
    console.log(`${icon} ${path.relative(__dirname, file)} - ${result.status} - ${result.reason}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  
  const migrated = results.filter(r => r.status === 'migrated').length;
  const updated = results.filter(r => r.status === 'updated').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Migrated: ${migrated} files (logger added)`);
  console.log(`🔄 Updated: ${updated} files (console replaced)`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log('='.repeat(80));
  
  if (errors > 0) {
    console.log('\n⚠️  Files with errors:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  - ${path.relative(__dirname, r.file)}: ${r.reason}`);
    });
  }
  
  console.log('\n🎉 Migration complete! Run your tests to verify everything works.');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

