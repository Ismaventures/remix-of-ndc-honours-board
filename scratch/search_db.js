const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

const query = '1782053780113';
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('Searching for database references containing:', query);

for (const table of tables) {
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  for (const col of columns) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table.name} WHERE "${col.name}" LIKE ?`).all(`%${query}%`);
      if (rows.length > 0) {
        console.log(`Found in table: ${table.name}, column: ${col.name}`);
        console.log(JSON.stringify(rows, null, 2));
      }
    } catch (_) {}
  }
}

// Also search for the string "ambient-pad"
const query2 = 'ambient-pad';
console.log('Searching for database references containing:', query2);

for (const table of tables) {
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
  for (const col of columns) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table.name} WHERE "${col.name}" LIKE ?`).all(`%${query2}%`);
      if (rows.length > 0) {
        console.log(`Found in table: ${table.name}, column: ${col.name}`);
        console.log(JSON.stringify(rows, null, 2));
      }
    } catch (_) {}
  }
}

process.exit(0);
