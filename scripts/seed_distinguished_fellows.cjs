const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const jsonPath = path.join(projectRoot, 'local_media', 'courses', 'Distinguished_Fellow_War_College.json');
const dbPath = path.join(projectRoot, 'database.sqlite');

if (!fs.existsSync(jsonPath)) {
  console.error(`Error: Source JSON file not found at ${jsonPath}`);
  process.exit(1);
}

console.log('Loading source JSON...');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(rawData);

console.log(`Connecting to SQLite database at ${dbPath}...`);
const db = new Database(dbPath);

// Ranks helper mapping to service
function getServiceFromRankAndName(rank, name, category) {
  const r = (rank || '').toLowerCase();
  const n = (name || '').toLowerCase();
  
  if (category === 'Allied' || n.includes('(uk)') || n.includes('(usa)') || n.includes('(ghana)') || n.includes('(niger)')) {
    return 'Foreign';
  }
  
  if (r.includes('cdre') || r.includes('commodore') || r.includes('admiral') || r.includes('capt') || r.includes('commander')) {
    return 'Navy';
  }
  if (r.includes('air') || r.includes('gp') || r.includes('wing') || r.includes('sqn')) {
    return 'Air Force';
  }
  if (r.includes('gen') || r.includes('col') || r.includes('lt col') || r.includes('maj') || r.includes('lieutenant')) {
    return 'Army';
  }
  if (r.includes('amb') || r.includes('prof') || r.includes('dr') || r.includes('mr') || r.includes('mrs') || r.includes('ms')) {
    return 'Civilian';
  }
  return 'Civilian'; // default fallback
}

// Period helper parsing
function parsePeriod(periodStr) {
  if (!periodStr) return { start: 0, end: 0 };
  const cleaned = periodStr.replace(/\s+/g, '');
  const parts = cleaned.split(/[-–/]/);
  if (parts.length === 1) {
    const yr = parseInt(parts[0], 10);
    if (!isNaN(yr)) {
      return { start: yr, end: yr };
    }
  } else if (parts.length >= 2) {
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }
  return { start: 0, end: 0 };
}

// Course number helper matching FellowsByCourse logic
function getCourseNumber(periodStart, periodEnd, category) {
  const assignedCourses = [];
  const startY = periodStart;
  const endY = periodEnd || periodStart;
  for (let y = startY; y <= endY; y++) {
    const derivedCourse = y - 1992;
    if (derivedCourse >= 1) {
      if (category === 'FWC' && derivedCourse >= 1 && derivedCourse <= 15) {
        assignedCourses.push(derivedCourse);
      }
      if (category === 'FDC' && derivedCourse >= 16) {
        assignedCourses.push(derivedCourse);
      }
      if (category === 'Allied') {
        assignedCourses.push(derivedCourse);
      }
    }
  }
  
  if (assignedCourses.length === 0 && periodStart) {
    const derived = periodStart - 1991;
    assignedCourses.push(derived);
  }
  
  return assignedCourses[0] || (category === 'FWC' ? 1 : 16);
}

function getDecoration(courseNumber, category) {
  if (category === 'FWC') {
    return `CSE ${courseNumber}`;
  } else if (category === 'FDC') {
    return `NWC Course ${courseNumber}`;
  } else {
    return `Allied Course ${courseNumber}`;
  }
}

function generateDefaultCitation(rank, name, category, periodStart, periodEnd) {
  const pStr = periodEnd && periodEnd !== periodStart ? `from ${periodStart} to ${periodEnd}` : `in ${periodStart}`;
  const catFull = category === 'FWC' ? 'War College' : category === 'FDC' ? 'Defence College' : 'Allied Officers';
  const rankStr = rank ? `${rank} ` : '';
  return `${rankStr}${name} was recognized as a Distinguished Fellow of the National ${catFull} and served ${pStr}, contributing to strategic defence learning.`;
}

let insertedCount = 0;
let updatedCount = 0;

try {
  // Ensure the table schema exists, though it should already
  db.prepare(`
    CREATE TABLE IF NOT EXISTS personnel (
      id text PRIMARY KEY,
      name text NOT NULL,
      rank text NOT NULL,
      category text NOT NULL,
      service text NOT NULL,
      period_start integer NOT NULL,
      period_end integer NOT NULL,
      image_url text,
      citation text,
      decoration text,
      seniority_order integer
    )
  `).run();

  const categoriesToSeed = [
    { key: 'distinguished_fellow_war_college', name: 'FWC' },
    { key: 'distinguished_fellow_defence_college', name: 'FDC' },
    { key: 'allied_officers', name: 'Allied' }
  ];

  console.log('Starting SQLite transaction...');
  db.transaction(() => {
    for (const catConfig of categoriesToSeed) {
      const records = data[catConfig.key] || [];
      console.log(`Processing ${records.length} records for ${catConfig.name}...`);
      
      for (const record of records) {
        const serial = record.serial;
        const name = record.name;
        const rank = record.rank || '';
        const category = catConfig.name;
        const periodStr = record.period;
        
        const { start: period_start, end: period_end } = parsePeriod(periodStr);
        const service = getServiceFromRankAndName(rank, name, category);
        const courseNumber = getCourseNumber(period_start, period_end, category);
        const decoration = getDecoration(courseNumber, category);
        
        // Structure ID to match format: p-fwc-local-1-007
        const paddedSerial = String(serial).padStart(3, '0');
        const id = `p-${category.toLowerCase()}-local-${courseNumber}-${paddedSerial}`;
        
        // Check if record already exists
        const existing = db.prepare('SELECT image_url, citation FROM personnel WHERE id = ?').get(id);
        
        if (existing) {
          // If it exists, update rank, name, periods but preserve image_url and citation
          db.prepare(`
            UPDATE personnel
            SET name = ?, rank = ?, category = ?, service = ?, period_start = ?, period_end = ?, decoration = ?, seniority_order = ?
            WHERE id = ?
          `).run(name, rank, category, service, period_start, period_end, decoration, serial, id);
          updatedCount++;
        } else {
          // Insert new record with null image_url and default citation
          const defaultCitation = generateDefaultCitation(rank, name, category, period_start, period_end);
          db.prepare(`
            INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, image_url, citation, decoration, seniority_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, name, rank, category, service, period_start, period_end, null, defaultCitation, decoration, serial);
          insertedCount++;
        }
      }
    }
  })();

  console.log(`\nSuccess! Seeding Completed.`);
  console.log(`New Records Inserted: ${insertedCount}`);
  console.log(`Existing Records Updated/Verified: ${updatedCount}`);
  console.log(`Total Personnel Records: ${db.prepare('SELECT COUNT(*) as count FROM personnel').get().count}`);
  
} catch (err) {
  console.error('Seeding transaction failed:', err);
} finally {
  db.close();
  console.log('Database connection closed.');
  process.exit(0);
}
