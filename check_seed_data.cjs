const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'seed-data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('--- Seed Data Analysis ---');
if (data.personnel) {
  const personnelWithImages = data.personnel.filter(p => p.image_url);
  console.log(`Total personnel in seed-data: ${data.personnel.length}`);
  console.log(`Personnel with image_url in seed-data: ${personnelWithImages.length}`);
  personnelWithImages.forEach((p, idx) => {
    console.log(`  ${idx+1}. [${p.category}] ${p.name}: ${p.image_url}`);
  });
} else {
  console.log('No personnel key found in seed-data');
}

if (data.commandants) {
  const cmdWithImages = data.commandants.filter(c => c.image_url);
  console.log(`Total commandants in seed-data: ${data.commandants.length}`);
  console.log(`Commandants with image_url in seed-data: ${cmdWithImages.length}`);
}

process.exit(0);
