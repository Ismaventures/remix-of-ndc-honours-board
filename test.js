const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');
const match = code.match(/admin-[^>]*/);
console.log(match ? match[0] : 'no admin match');
