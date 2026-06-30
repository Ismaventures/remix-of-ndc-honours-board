const fs = require('fs');
const path = require('path');

const tokenPath = path.join(process.env.HOME, 'Library/Application Support/ndc-honours-board/dropbox-token.json');

if (!fs.existsSync(tokenPath)) {
  console.log('No token found at:', tokenPath);
  process.exit(1);
}

const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
console.log('Using active token...');

async function run() {
  try {
    const resp = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: '', recursive: true })
    });

    if (!resp.ok) {
      console.log('Error listing folder:', resp.status, await resp.text());
      return;
    }

    const data = await resp.json();
    console.log('\n--- Remote Files Found in Dropbox Sandbox ---');
    if (data.entries.length === 0) {
      console.log('No files found (folder is empty).');
    } else {
      data.entries.forEach(entry => {
        console.log(`[${entry['.tag'].toUpperCase()}] Path: ${entry.path_display} (Size: ${entry.size || 0} bytes)`);
      });
    }
    console.log('---------------------------------------------\n');
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

run();
