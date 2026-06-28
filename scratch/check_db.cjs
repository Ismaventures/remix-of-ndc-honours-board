const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/Users/Kingsolo/projects/remix-of-ndc-honours-board/database.sqlite';

try {
  const db = new Database(dbPath, { readonly: true });
  const personnelCount = db.prepare("SELECT COUNT(*) as count FROM personnel").get();
  const commandantCount = db.prepare("SELECT COUNT(*) as count FROM commandants").get();
  console.log('Personnel count:', personnelCount.count);
  console.log('Commandant count:', commandantCount.count);
  
  // Print first 3 personnel if any
  if (personnelCount.count > 0) {
    const list = db.prepare("SELECT name, image_url FROM personnel LIMIT 3").all();
    console.log('Sample personnel:', list);
  }
  db.close();
} catch (err) {
  console.error('Error opening DB:', err.message);
}
