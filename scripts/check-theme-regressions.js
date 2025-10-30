#!/usr/bin/env node

/**
 * Theme Regression Checker
 * 
 * This script checks for common styling regressions that might indicate
 * lost theme styling. Run this before committing changes.
 * 
 * Usage: node scripts/check-theme-regressions.js [file-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WARNINGS = {
  whiteBackground: /bg-white/g,
  whiteText: /text-white(?![^\s]*\/)/g, // Exclude text-white/opacity variants
  missingThemeImport: /from ['"]@\/lib\/theme['"]/g,
  hardcodedDarkColor: /(bg-\[#(151A22|0f141b)\])/g,
};

const INFO = {
  usingTheme: /themeClasses|theme\./g,
  usingStyled: /Styled(Input|Textarea|Label)/g,
};

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const positives = [];

  // Check for warnings
  for (const [name, pattern] of Object.entries(WARNINGS)) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'warning',
        name,
        count: matches.length,
        file: filePath,
      });
    }
  }

  // Check for positives
  for (const [name, pattern] of Object.entries(INFO)) {
    const matches = content.match(pattern);
    if (matches) {
      positives.push({
        type: 'positive',
        name,
        count: matches.length,
        file: filePath,
      });
    }
  }

  return { issues, positives };
}

function checkGitDiff() {
  try {
    const diff = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const files = diff.split('\n').filter(Boolean);
    return files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  } catch {
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  let filesToCheck = [];

  if (args.length > 0) {
    // Check specific file
    filesToCheck = [path.resolve(args[0])];
  } else {
    // Check staged files or common component directories
    filesToCheck = checkGitDiff();
    if (filesToCheck.length === 0) {
      // Fallback: check common directories
      const srcPath = path.join(process.cwd(), 'src');
      if (fs.existsSync(srcPath)) {
        filesToCheck = findTsxFiles(srcPath);
      }
    }
  }

  if (filesToCheck.length === 0) {
    console.log('ℹ️  No files to check. Stage some files or provide a file path.');
    process.exit(0);
  }

  const allIssues = [];
  const allPositives = [];

  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  File not found: ${file}`);
      continue;
    }

    const { issues, positives } = checkFile(file);
    allIssues.push(...issues);
    allPositives.push(...positives);
  }

  // Report results
  console.log('\n📊 Theme Regression Check Results\n');

  if (allPositives.length > 0) {
    console.log('✅ Positive indicators (using theme system):');
    allPositives.forEach(p => {
      console.log(`   ${p.name}: ${p.count} occurrences in ${path.relative(process.cwd(), p.file)}`);
    });
    console.log();
  }

  if (allIssues.length > 0) {
    console.log('⚠️  Potential issues found:');
    allIssues.forEach(issue => {
      const relPath = path.relative(process.cwd(), issue.file);
      console.log(`   ${issue.name}: ${issue.count} occurrence(s) in ${relPath}`);
    });
    console.log('\n💡 Tips:');
    console.log('   - If you see "whiteBackground", consider using theme constants');
    console.log('   - If you see "hardcodedDarkColor", use themeClasses.* instead');
    console.log('   - Use StyledInput, StyledTextarea, StyledLabel when possible');
    console.log('   - Check docs/guides/THEME_SYSTEM.md for best practices');
    console.log();
    process.exit(1);
  } else {
    console.log('✅ No styling regressions detected!');
    console.log();
    process.exit(0);
  }
}

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.includes('node_modules')) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

if (require.main === module) {
  main();
}

module.exports = { checkFile };

