const driveSync = require('../electron/driveSync.cjs');
const { app } = require('electron');

app.whenReady().then(async () => {
  console.log('Testing Drive auth status...');
  try {
    const status = await driveSync.getAuthStatus();
    console.log('Auth Status:', status);
    app.quit();
  } catch (err) {
    console.error('Error:', err);
    app.quit();
  }
});
