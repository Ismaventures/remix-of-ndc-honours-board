import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Fix double-wrapped sidebar collapsed conditionals
code = code.replace(
  /\{!isSidebarCollapsed && \{!isSidebarCollapsed && (<p [^}]+<\/p>)\}\}/g,
  '{!isSidebarCollapsed && $1}'
);

// Fix double-wrapped title
code = code.replace(
  /\{!isSidebarCollapsed && \{!isSidebarCollapsed && (<div>[\s\S]*?<\/div>)\}/,
  '{!isSidebarCollapsed && $1}'
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
console.log('Fixed double-wrapped sidebar conditionals');
