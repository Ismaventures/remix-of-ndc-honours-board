const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

try {
  // Check personnel
  const personnel = db.prepare("SELECT id, name, category, image_url FROM personnel WHERE image_url NOT LIKE 'local-media%' AND image_url IS NOT NULL AND image_url != ''").all();
  console.log(`Personnel with non-local image_url in DB: ${personnel.length}`);
  personnel.forEach(p => console.log(`  - [${p.category}] ${p.name}: ${p.image_url}`));

  // Check commandants
  const commandants = db.prepare("SELECT id, name, image_url FROM commandants WHERE image_url NOT LIKE 'local-media%' AND image_url IS NOT NULL AND image_url != ''").all();
  console.log(`Commandants with non-local image_url in DB: ${commandants.length}`);
  commandants.forEach(c => console.log(`  - ${c.name}: ${c.image_url}`));

  // Check visits
  const visits = db.prepare("SELECT id, name, image_url FROM visits WHERE image_url NOT LIKE 'local-media%' AND image_url IS NOT NULL AND image_url != ''").all();
  console.log(`Visits with non-local image_url in DB: ${visits.length}`);
  visits.forEach(v => console.log(`  - ${v.name}: ${v.image_url}`));

} catch (err) {
  console.error(err);
} finally {
  db.close();
  process.exit(0);
}
