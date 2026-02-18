#!/usr/bin/env node
/**
 * CI check: fail if any source file imports from @/utils/... (direct module path).
 * Canonical pattern is: import { ... } from '@/utils';
 * This ensures a single resolution point and prevents Metro/alias issues.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcDirs = ['app', 'components', 'contexts', 'hooks', 'lib', 'constants', 'types'];

const directUtilsPattern = /from\s+['"]@\/utils\/[^'"]+['"]/g;

function walkDir(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
      walkDir(full, ext, callback);
    } else if (e.isFile() && (ext === null || full.endsWith(ext))) {
      callback(full);
    }
  }
}

const violations = [];
for (const d of srcDirs) {
  const dir = path.join(projectRoot, d);
  walkDir(dir, '.ts', (file) => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(directUtilsPattern);
    if (matches) violations.push({ file: path.relative(projectRoot, file), matches });
  });
  walkDir(dir, '.tsx', (file) => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(directUtilsPattern);
    if (matches) violations.push({ file: path.relative(projectRoot, file), matches });
  });
}

if (violations.length > 0) {
  console.error('error: Use canonical utils import: from \'@/utils\' (not @/utils/...)');
  for (const { file, matches } of violations) {
    console.error('  ' + file + ': ' + matches.join(', '));
  }
  process.exit(1);
}
console.log('check:aliases passed (all utils imports use @/utils)');
