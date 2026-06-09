const fs = require('fs');
const code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const lines = code.split('\n');

// Find the return ( line
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'return (' && i > 300 && i < 1100) {
    start = i;
    break;
  }
}

// Find matching );
let parenDepth = 0;
let end = -1;
for (let i = start; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '(') parenDepth++;
    if (ch === ')') { parenDepth--; if (parenDepth === 0) { end = i; break; } }
  }
  if (end >= 0) break;
}

console.log(`Return block: lines ${start+1} to ${end+1}`);

// Now, within the return block, do a proper JSX tag balance
const block = lines.slice(start, end + 1).join('\n');

// Find all opening tags and closing tags
const openPattern = /<([a-zA-Z][a-zA-Z0-9.]*)(?:\s|>|\/)/g;
const closePattern = /<\/([a-zA-Z][a-zA-Z0-9.]*)>/g;
const selfClosePattern = /\/>/g;

let opens = {};
let closes = {};
let m;

while ((m = openPattern.exec(block)) !== null) {
  // Check if it's inside a template literal (backslash or backtick context)
  const before = block.substring(Math.max(0, m.index - 200), m.index);
  if (before.includes('`') && (before.split('`').length % 2 === 0)) continue; // inside template
  const tag = m[1];
  opens[tag] = (opens[tag] || 0) + 1;
}

while ((m = closePattern.exec(block)) !== null) {
  const before = block.substring(Math.max(0, m.index - 200), m.index);
  if (before.includes('`') && (before.split('`').length % 2 === 0)) continue;
  const tag = m[1];
  closes[tag] = (closes[tag] || 0) + 1;
}

// Self-closing reduces opens
const selfCloses = (block.match(selfClosePattern) || []).length;

console.log('\nTag balance (opens - closes):');
const allTags = new Set([...Object.keys(opens), ...Object.keys(closes)]);
for (const tag of [...allTags].sort()) {
  const o = opens[tag] || 0;
  const c = closes[tag] || 0;
  if (o !== c) {
    console.log(`  <${tag}>: ${o} opens, ${c} closes => DIFF ${o - c}`);
  }
}
console.log(`\nSelf-closing tags: ${selfCloses}`);
