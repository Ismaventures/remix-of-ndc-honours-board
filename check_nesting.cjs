// Count JSX nesting in AdminPanel return statement
const fs = require('fs');
const code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const lines = code.split('\n');

// Find the return ( line inside AdminPanel
let returnLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'return (' && i > 300 && i < 1100) {
    returnLine = i;
    break;
  }
}
console.log('Return statement at line:', returnLine + 1);

// Count open/close divs from returnLine to end of function
let depth = 0;
let funcEnd = -1;
for (let i = returnLine; i < lines.length; i++) {
  const line = lines[i];
  // Count JSX open tags (simplified)
  const opens = (line.match(/<(div|main|aside|section|style|button|p|h[1-6]|span|label|select|input|textarea|table|thead|tbody|tr|td|th|form|ul|li|ol|nav|header|footer|article)[\s>\/]/g) || []).length;
  // Count JSX close tags
  const closes = (line.match(/<\/(div|main|aside|section|style|button|p|h[1-6]|span|label|select|input|textarea|table|thead|tbody|tr|td|th|form|ul|li|ol|nav|header|footer|article)>/g) || []).length;
  // Count self-closing
  const selfClose = (line.match(/\/>/g) || []).length;
  
  depth += opens - closes;
  
  if (line.trim() === ');' && i > returnLine + 5) {
    console.log(`Line ${i+1}: closing );  depth=${depth}`);
    if (depth <= 0) {
      funcEnd = i;
      break;
    }
  }
}

// Now specifically track div/main/aside opens and closes
let divStack = [];
for (let i = returnLine; i < (funcEnd > 0 ? funcEnd + 1 : lines.length); i++) {
  const line = lines[i];
  
  // Track opening tags
  const openMatches = line.matchAll(/<(div|main|aside)\b/g);
  for (const m of openMatches) {
    // Check if self-closing
    if (!line.includes('/>')) {
      divStack.push({ tag: m[1], line: i + 1 });
    }
  }
  
  // Track closing tags
  const closeMatches = line.matchAll(/<\/(div|main|aside)>/g);
  for (const m of closeMatches) {
    if (divStack.length > 0) {
      const last = divStack.pop();
      if (last.tag !== m[1]) {
        console.log(`MISMATCH at line ${i+1}: closing </${m[1]}> but expected </${last.tag}> (opened at line ${last.line})`);
        divStack.push(last); // put it back
      }
    } else {
      console.log(`EXTRA close at line ${i+1}: </${m[1]}> with no matching open`);
    }
  }
}

if (divStack.length > 0) {
  console.log('\nUNCLOSED TAGS:');
  divStack.forEach(s => console.log(`  <${s.tag}> opened at line ${s.line}`));
} else {
  console.log('\nAll div/main/aside tags balanced!');
}
