const fs = require('fs');
const path = require('path');

const tokenPath = path.join(process.env.HOME, 'Library/Application Support/ndc-honours-board/dropbox-token.json');

if (!fs.existsSync(tokenPath)) {
  console.log('No token found at:', tokenPath);
  process.exit(1);
}

const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
console.log('Found token. Access token starts with:', token.access_token.slice(0, 10));

async function run() {
  console.log('\n--- Test 1: No body ---');
  try {
    const resp = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Status:', resp.status, resp.statusText);
    console.log('Response:', await resp.text());
  } catch (err) {
    console.error('Failed:', err.message);
  }

  console.log('\n--- Test 2: Null body ("null") ---');
  try {
    const resp = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: 'null'
    });
    console.log('Status:', resp.status, resp.statusText);
    console.log('Response:', await resp.text());
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

run();
