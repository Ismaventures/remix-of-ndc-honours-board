const { google } = require('googleapis');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function getCredentialsPath() {
  return path.join(__dirname, '..', 'electron', 'drive-credentials.json');
}

function getTokenPath() {
  return '/Users/Kingsolo/Library/Application Support/vite_react_shadcn_ts/drive-token.json';
}

app.whenReady().then(async () => {
  console.log('Testing drive.about.get with current token...');
  try {
    const credsPath = getCredentialsPath();
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8')).installed || JSON.parse(fs.readFileSync(credsPath, 'utf8')).web;

    const tokenPath = getTokenPath();
    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

    const oauth2Client = new google.auth.OAuth2(creds.client_id, creds.client_secret, 'http://localhost:3456');
    oauth2Client.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const res = await drive.about.get({ fields: 'user' });
    console.log('Success! User Info:', res.data.user);
    app.quit();
  } catch (err) {
    console.error('Error fetching about info:', err.message);
    app.quit();
  }
});
