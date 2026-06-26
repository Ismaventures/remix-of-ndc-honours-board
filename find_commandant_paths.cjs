const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

try {
  const records = db.prepare("SELECT id, name, image_url FROM commandants").all();
  console.log(`Total commandants: ${records.length}`);
  records.forEach((r, i) => {
    const destPath = r.image_url ? path.join(__dirname, 'local_media', r.image_url.replace('local-media://', '')) : 'none';
    const exists = destPath !== 'none' && fs.existsSync(destPath);
    console.log(`${i+1}. ${r.name}: ${r.image_url} (exists: ${exists})`);
  });
} catch (err) {
  console.error(err);
} finally {
  db.close();
  process.exit(0);
}
