const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Checking database at:', dbPath);

if (!fs.existsSync(dbPath)) {
  console.error('Database file does not exist!');
  process.exit(1);
}

const db = new Database(dbPath);

try {
  const totalPersonnel = db.prepare('SELECT COUNT(*) as count FROM personnel').get().count;
  console.log('Total personnel in DB:', totalPersonnel);

  const remotePersonnel = db.prepare("SELECT COUNT(*) as count FROM personnel WHERE image_url LIKE 'http%'").get().count;
  console.log('Personnel with remote image_url (http...):', remotePersonnel);

  const localPersonnel = db.prepare("SELECT COUNT(*) as count FROM personnel WHERE image_url LIKE 'local-media%'").get().count;
  console.log('Personnel with local image_url (local-media...):', localPersonnel);

  const nullPersonnel = db.prepare("SELECT COUNT(*) as count FROM personnel WHERE image_url IS NULL OR image_url = ''").get().count;
  console.log('Personnel with null/empty image_url:', nullPersonnel);

  console.log('\nSample personnel records with image_urls:');
  const samples = db.prepare("SELECT id, name, category, image_url FROM personnel WHERE image_url IS NOT NULL AND image_url != '' LIMIT 10").all();
  for (const s of samples) {
    console.log(`- [${s.category}] ${s.name}: ${s.image_url}`);
  }

} catch (err) {
  console.error('Error querying database:', err);
} finally {
  db.close();
}
