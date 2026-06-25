const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const LOCAL_MEDIA_DIR = path.join(__dirname, 'local_media');

const db = new Database(dbPath);

try {
  const personnel = db.prepare("SELECT id, name, category, image_url FROM personnel").all();
  console.log(`Checking ${personnel.length} personnel records...`);

  let missingCount = 0;
  let hasImageCount = 0;
  
  for (const p of personnel) {
    if (!p.image_url) {
      console.log(`- [${p.category}] ${p.name}: No image URL`);
      continue;
    }
    hasImageCount++;
    
    // Parse local path
    let relPath = p.image_url.replace('local-media://', '');
    const destPath = path.join(LOCAL_MEDIA_DIR, relPath);
    
    if (!fs.existsSync(destPath)) {
      missingCount++;
      console.log(`- MISSING [${p.category}] ${p.name}: ${p.image_url} (Expected: ${destPath})`);
    }
  }
  
  console.log(`\nChecking commandants records...`);
  const commandants = db.prepare("SELECT id, name, image_url FROM commandants").all();
  let missingCmdCount = 0;
  let hasCmdImageCount = 0;
  for (const c of commandants) {
    if (!c.image_url) {
      console.log(`- Commandant ${c.name}: No image URL`);
      continue;
    }
    hasCmdImageCount++;
    let relPath = c.image_url.replace('local-media://', '');
    const destPath = path.join(LOCAL_MEDIA_DIR, relPath);
    if (!fs.existsSync(destPath)) {
      missingCmdCount++;
      console.log(`- MISSING Commandant ${c.name}: ${c.image_url} (Expected: ${destPath})`);
    }
  }
  
  console.log(`\nResults:`);
  console.log(`- Personnel with image URLs: ${hasImageCount}`);
  console.log(`- Missing personnel files: ${missingCount}`);
  console.log(`- Existing personnel files: ${hasImageCount - missingCount}`);
  console.log(`- Commandants with image URLs: ${hasCmdImageCount}`);
  console.log(`- Missing commandant files: ${missingCmdCount}`);

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
  process.exit(0);
}

