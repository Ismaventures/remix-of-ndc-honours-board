const driveSync = require('../electron/driveSync.cjs');
const { app } = require('electron');

console.log('Testing Drive auth status...');
driveSync.getAuthStatus().then(status => {
  console.log('Auth Status:', status);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
