const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

try {
  const records = db.prepare("SELECT id, name, category, rank, image_url FROM personnel WHERE category IN ('FWC', 'FDC')").all();
  console.log(`Total FWC/FDC records: ${records.length}`);
  records.forEach((r, i) => {
    console.log(`${i+1}. [${r.category}] ${r.rank} ${r.name}: ${r.image_url}`);
  });
} catch (err) {
  console.error(err);
} finally {
  db.close();
  process.exit(0);
}
