const driveSync = require('../electron/driveSync.cjs');
const { app } = require('electron');

app.whenReady().then(async () => {
  console.log('Testing Drive authorize flow...');
  try {
    const promise = driveSync.authorize();
    console.log('Authorize server started. Check if browser opened.');
    const result = await promise;
    console.log('Authorize Result:', result);
    app.quit();
  } catch (err) {
    console.error('Error during authorization:', err);
    app.quit();
  }
});
