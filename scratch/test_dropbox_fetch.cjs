const fs = require('fs');
const path = require('path');

async function testFetch() {
  console.log('Testing connectivity to Google...');
  try {
    const res = await fetch('https://www.google.com');
    console.log('Google fetch status:', res.status, res.statusText);
  } catch (err) {
    console.error('Google fetch failed:', err);
  }

  console.log('\nTesting connectivity to Dropbox API...');
  try {
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'null'
    });
    console.log('Dropbox fetch status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Dropbox response:', text);
  } catch (err) {
    console.error('Dropbox fetch failed:', err);
  }
}

testFetch();
