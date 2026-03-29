const fs = require('fs');
const filePath = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "{(tab === 'theme' || tab === 'transitions') && (";
const endMarker = "{guideFlowActive && tab !== 'guide' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Removed old scope successfully.');
} else {
    console.log('Could not find markers.');
}
