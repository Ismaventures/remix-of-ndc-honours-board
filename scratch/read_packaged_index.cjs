const fs = require('fs');
const path = require('path');

const targetPath = '/Users/Kingsolo/projects/remix-of-ndc-honours-board/dist-electron/mac-arm64/NDCHonoursBoard.app/Contents/Resources/app.asar/dist/index.html';

try {
  if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf8');
    console.log('File exists. Length:', content.length);
    console.log('First 200 chars:', content.slice(0, 200));
  } else {
    console.log('File does NOT exist at path:', targetPath);
  }
} catch (err) {
  console.error('Error reading packaged file:', err.message);
}
