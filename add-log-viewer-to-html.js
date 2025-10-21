#!/usr/bin/env node
/**
 * Automated script to add log viewer to all test HTML files
 * Run with: node add-log-viewer-to-html.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if file already has log viewer
function hasLogViewer(content) {
  return content.includes('log-viewer.js');
}

// Add log viewer script to head
function addLogViewerScript(content) {
  // Find the closing </head> tag
  const headCloseIndex = content.indexOf('</head>');
  
  if (headCloseIndex === -1) {
    console.warn('Could not find </head> tag');
    return content;
  }
  
  const logViewerScript = `    
    <!-- Visual Log Viewer -->
    <script src="log-viewer.js"></script>
`;
  
  return content.slice(0, headCloseIndex) + logViewerScript + '\n' + content.slice(headCloseIndex);
}

// Add padding to body style for log viewer space
function addBodyPadding(content) {
  // Try to find existing body style
  const bodyStyleMatch = content.match(/body\s*{([^}]*)}/);
  
  if (bodyStyleMatch) {
    const existingStyles = bodyStyleMatch[1];
    
    // Check if padding-bottom already exists
    if (existingStyles.includes('padding-bottom')) {
      // Update existing padding-bottom
      const updated = existingStyles.replace(
        /padding-bottom:\s*[^;]+;/,
        'padding-bottom: 420px; /* Make room for log viewer */'
      );
      return content.replace(bodyStyleMatch[0], `body {${updated}}`);
    } else {
      // Add padding-bottom to existing styles
      const updated = existingStyles + '\n            padding-bottom: 420px; /* Make room for log viewer */';
      return content.replace(bodyStyleMatch[0], `body {${updated}}`);
    }
  }
  
  // If no body style found, try to add one
  const styleOpenIndex = content.indexOf('<style>');
  if (styleOpenIndex !== -1) {
    const insertPoint = styleOpenIndex + 7; // After <style>
    const bodyStyle = `
        body {
            padding-bottom: 420px; /* Make room for log viewer */
        }`;
    return content.slice(0, insertPoint) + bodyStyle + content.slice(insertPoint);
  }
  
  // If no <style> tag, create one
  const headOpenIndex = content.indexOf('<head>');
  if (headOpenIndex !== -1) {
    const insertPoint = headOpenIndex + 6;
    const style = `
    <style>
        body {
            padding-bottom: 420px; /* Make room for log viewer */
        }
    </style>`;
    return content.slice(0, insertPoint) + style + content.slice(insertPoint);
  }
  
  return content;
}

// Process a single HTML file
async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Skip if already has log viewer
    if (hasLogViewer(content)) {
      return { file: filePath, status: 'skipped', reason: 'Already has log viewer' };
    }
    
    // Add log viewer script
    content = addLogViewerScript(content);
    
    // Add body padding
    content = addBodyPadding(content);
    
    // Write updated file
    await fs.writeFile(filePath, content, 'utf8');
    
    return { file: filePath, status: 'updated', reason: 'Log viewer added' };
  } catch (error) {
    return { file: filePath, status: 'error', reason: error.message };
  }
}

// Main execution
async function main() {
  console.log('🔍 Finding test HTML files...\n');
  
  const allFiles = await fs.readdir(__dirname);
  const files = allFiles.filter(f => f.startsWith('test-') && f.endsWith('.html'));
  
  console.log(`Found ${files.length} test files\n`);
  console.log('📝 Processing files...\n');
  
  const results = [];
  for (const file of files) {
    const fullPath = path.join(__dirname, file);
    const result = await processFile(fullPath);
    results.push(result);
    
    const icon = result.status === 'updated' ? '✅' :
                 result.status === 'error' ? '❌' : '⏭️';
    
    console.log(`${icon} ${file} - ${result.status} - ${result.reason}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(80));
  
  const updated = results.filter(r => r.status === 'updated').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Updated: ${updated} files (log viewer added)`);
  console.log(`⏭️  Skipped: ${skipped} files (already have log viewer)`);
  console.log(`❌ Errors: ${errors} files`);
  console.log('='.repeat(80));
  
  if (errors > 0) {
    console.log('\n⚠️  Files with errors:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`  - ${r.file}: ${r.reason}`);
    });
  }
  
  console.log('\n🎉 Update complete! Open any test HTML file to see the log viewer in action.');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

