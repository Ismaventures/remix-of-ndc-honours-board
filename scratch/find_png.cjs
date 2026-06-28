const fs = require('fs');
const path = require('path');

function findPng(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist-electron') {
        findPng(fullPath);
      }
    } else if (entry.name.endsWith('.png')) {
      const content = fs.readFileSync(fullPath);
      if (content.includes('2026-01-08T21:13:32+00:00')) {
        console.log('Found matching PNG:', fullPath);
      }
    }
  }
}

console.log('Searching for PNG with timestamp...');
findPng('/Users/Kingsolo/projects/remix-of-ndc-honours-board');
console.log('Search complete.');
