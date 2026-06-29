import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = './database.sqlite';
const JSON_DATA_PATH = './local_media/courses/Distinguished_Fellow_War_College.json';
const TRACKER_PATH = './local_media/courses/upload_tracker.json';
const UNMATCHED_PATH = './local_media/courses/unmatched_images.json';
const COURSES_DIR = './local_media/courses';

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// 1. Load tracker files if they exist, or create empty ones
let tracker = { uploaded_files: {} };
if (fs.existsSync(TRACKER_PATH)) {
  try {
    tracker = JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf8'));
    if (!tracker.uploaded_files) {
      tracker.uploaded_files = {};
    }
  } catch (e) {
    console.warn(`Failed to parse tracker JSON, starting fresh: ${e.message}`);
  }
}

// Ensure the tracker has the correct structure
if (typeof tracker !== 'object' || Array.isArray(tracker)) {
  tracker = { uploaded_files: {} };
}

let unmatchedTracker = { unmatched_files: [] };
if (fs.existsSync(UNMATCHED_PATH)) {
  try {
    unmatchedTracker = JSON.parse(fs.readFileSync(UNMATCHED_PATH, 'utf8'));
    if (!Array.isArray(unmatchedTracker.unmatched_files)) {
      unmatchedTracker.unmatched_files = [];
    }
  } catch (e) {
    console.warn(`Failed to parse unmatched JSON, starting fresh: ${e.message}`);
  }
}

// Ensure unmatchedTracker has correct structure
if (typeof unmatchedTracker !== 'object' || Array.isArray(unmatchedTracker)) {
  unmatchedTracker = { unmatched_files: [] };
}

// 2. Load JSON data
if (!fs.existsSync(JSON_DATA_PATH)) {
  console.error(`JSON data file not found at ${JSON_DATA_PATH}`);
  process.exit(1);
}

let jsonContent;
try {
  jsonContent = JSON.parse(fs.readFileSync(JSON_DATA_PATH, 'utf8'));
} catch (e) {
  console.error(`Failed to parse JSON file: ${e.message}`);
  process.exit(1);
}

// 3. Normalize all JSON candidates
const candidates = [];

const pushCandidates = (list, dbCategory, decorationPrefix) => {
  if (Array.isArray(list)) {
    list.forEach(item => {
      candidates.push({
        ...item,
        dbCategory,
        decorationPrefix
      });
    });
  }
};

pushCandidates(jsonContent.distinguished_fellow_war_college, 'FWC', 'CSE');
pushCandidates(jsonContent.allied_officers, 'Allied', 'NWC Course'); // Allied can be either NWC Course or CSE, default to NWC Course
pushCandidates(jsonContent.distinguished_fellow_defence_college, 'FDC', 'NWC Course');

console.log(`Loaded ${candidates.length} candidate fellows from JSON.`);

// Common ranks to filter out when parsing filenames and names
const SKIP_TOKENS = new Set([
  'air', 'cdre', 'commodore', 'brig', 'gen', 'general', 'gp', 'capt', 'captain',
  'col', 'colonel', 'lt', 'lieutenant', 'maj', 'major', 'radm', 'rear', 'admiral', 'adm',
  'surv', 'surveyor', 'amb', 'ambassador', 'navy', 'army', 'force', 'royal', 'mr', 'mrs', 'dr', 'prof',
  'obe', 'cwc', 'psc', 'fss', 'mss', 'dss', 'gcon', 'con', 'cfr', 'ofr', 'oon', 'mon', 'fnse', 'mnse',
  'uk', 'nwc', 'cse', 'course'
]);

// Normalize name string into clean lowercase tokens
function tokenizeAndClean(nameStr) {
  if (!nameStr) return [];
  let s = nameStr.toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' '); // remove parentheses content
  s = s.replace(/[^a-z0-9]/g, ' ');  // replace punctuation with space
  let tokens = s.split(/\s+/).filter(Boolean);
  return tokens.filter(t => !SKIP_TOKENS.has(t));
}

function cleanStr(s) {
  return s.replace(/[^a-z0-9]/g, '');
}

// Matching score function between image and JSON candidate
function getMatchScore(fileTokens, jsonTokens) {
  if (fileTokens.length === 0 || jsonTokens.length === 0) return 0;

  // Extract surnames (assumed to be the last token)
  const fileSurname = cleanStr(fileTokens[fileTokens.length - 1]);
  const jsonSurname = cleanStr(jsonTokens[jsonTokens.length - 1]);

  // Strict check on surnames first
  if (fileSurname !== jsonSurname) {
    if (!fileSurname.includes(jsonSurname) && !jsonSurname.includes(fileSurname)) {
      return 0; // Surnames don't match or have substring relationships
    }
  }

  // Get rest of tokens
  const fileRest = fileTokens.slice(0, -1).map(cleanStr).filter(Boolean);
  const jsonRest = jsonTokens.slice(0, -1).map(cleanStr).filter(Boolean);

  const fileRestJoined = fileRest.join('');
  const jsonRestJoined = jsonRest.join('');

  // Perfect exact match of rest of tokens
  if (fileRestJoined && fileRestJoined === jsonRestJoined) {
    return 1.0;
  }

  // Check if there is a conflict in full names (e.g. "Albert" vs "Arthur")
  let fullWordConflict = false;
  const minLength = Math.min(fileRest.length, jsonRest.length);
  for (let i = 0; i < minLength; i++) {
    const f = fileRest[i];
    const j = jsonRest[i];
    if (f.length > 1 && j.length > 1 && f !== j) {
      fullWordConflict = true;
      break;
    }
  }
  if (fullWordConflict) {
    return 0; // Different full names
  }

  // One of them lacks initials/first name
  if (fileRest.length === 0 || jsonRest.length === 0) {
    return 0.8;
  }

  // Extract initials properly (keeping short run-together initials like "ah" intact)
  const getInitials = (tokens) => {
    return tokens.map(t => {
      if (t.length <= 2) return t;
      return t[0];
    }).join('');
  };

  const fileInitials = getInitials(fileRest);
  const jsonInitials = getInitials(jsonRest);

  if (fileInitials === jsonInitials) {
    return 0.95; // Matching initials
  }

  // If one is a prefix of the other (e.g. "a" and "ah" or "a" and "ab")
  if (fileInitials.startsWith(jsonInitials) || jsonInitials.startsWith(fileInitials)) {
    return 0.8; // Partial match (less than 0.85 database flexible match threshold)
  }

  return 0; // No match/conflict
}

// Parse start/end years from period
function parsePeriod(periodStr) {
  if (!periodStr) return { start: null, end: null };
  // Find all 4-digit numbers in the period
  const matches = periodStr.match(/\d{4}/g);
  if (!matches || matches.length === 0) return { start: null, end: null };

  const start = parseInt(matches[0], 10);
  const end = matches[1] ? parseInt(matches[1], 10) : start;
  return { start, end };
}

// Generate default citation for a new database entry
function generateCitation(name, category, start, end) {
  const periodText = start && end ? `from ${start} to ${end}` : 'during this period';
  if (category === 'FWC') {
    return `${name} was recognized in the War College cohort and served ${periodText}, contributing to strategic defence learning.`;
  }
  if (category === 'FDC') {
    return `${name} served in the Defence College era ${periodText}, contributing to higher defence and policy studies.`;
  }
  if (category === 'Allied') {
    return `${name} served as an Allied Officer ${periodText}, contributing to international military collaboration.`;
  }
  return `${name} was a distinguished fellow of the college serving ${periodText}.`;
}

// Detect service branch based on name, rank, or filename context
function detectService(rank, name, filename) {
  const text = `${rank} ${name} ${filename}`.toLowerCase();
  if (text.includes('air') || text.includes('gpcapt') || text.includes('gp capt') || text.includes('wg cdr') || text.includes('wing commander')) {
    return 'Air Force';
  }
  if (text.includes('cdre') || text.includes('navy') || text.includes('capt') || text.includes('admiral') || text.includes('adm') || text.includes('radm') || text.includes('royal navy')) {
    return 'Navy';
  }
  return 'Army';
}

// 4. Retrieve course directories under local_media/courses/
if (!fs.existsSync(COURSES_DIR)) {
  console.error(`Courses directory not found at ${COURSES_DIR}`);
  process.exit(1);
}

const courseFolders = fs.readdirSync(COURSES_DIR).filter(f => {
  const fullPath = path.join(COURSES_DIR, f);
  return fs.statSync(fullPath).isDirectory() && /^Course-\d+$/i.test(f);
});

console.log(`Found ${courseFolders.length} existing course image folders.`);

// Sort course folders numerical order
courseFolders.sort((a, b) => {
  const numA = parseInt(a.split('-')[1], 10);
  const numB = parseInt(b.split('-')[1], 10);
  return numA - numB;
});

// Run updates inside a transaction for SQLite
db.transaction(() => {
  for (const folder of courseFolders) {
    const courseNum = parseInt(folder.split('-')[1], 10);
    const folderPath = path.join(COURSES_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

    if (files.length === 0) {
      console.log(`No images found in folder: ${folder}. Skipping.`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Processing ${folder} (${files.length} images)...`);
    console.log(`========================================`);

    // Group candidates for this course, allowing +/- 2 courses variance due to data overlap
    const courseCandidates = candidates.filter(candidate => {
      const { start } = parsePeriod(candidate.period);
      if (!start) return false;
      const candidateCourse = start - 1991;
      return Math.abs(candidateCourse - courseNum) <= 2;
    });

    for (const file of files) {
      const trackerKey = `${folder}/${file}`;
      if (tracker.uploaded_files[trackerKey]) {
        console.log(`- Skipping ${file}: Already uploaded (ID: ${tracker.uploaded_files[trackerKey]})`);
        continue;
      }

      const fileBase = path.basename(file, path.extname(file));
      const fileTokens = tokenizeAndClean(fileBase);

      let bestCandidate = null;
      let bestScore = 0;

      // Find the best matching candidate in the course cohort
      for (const candidate of courseCandidates) {
        const candidateTokens = tokenizeAndClean(candidate.name);
        const score = getMatchScore(fileTokens, candidateTokens);

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      // If no match found in the cohort, expand query to all candidates
      if (bestScore < 0.75) {
        for (const candidate of candidates) {
          // Skip if already in courseCandidates since they were checked
          if (courseCandidates.some(c => c.name === candidate.name && c.dbCategory === candidate.dbCategory)) {
            continue;
          }
          const candidateTokens = tokenizeAndClean(candidate.name);
          const score = getMatchScore(fileTokens, candidateTokens);

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
          }
        }
      }

      if (bestCandidate && bestScore >= 0.75) {
        const { dbCategory, name, rank, period, decorationPrefix, serial } = bestCandidate;
        const localUrl = `local-media://courses/${folder}/${file}`;
        const defaultDecoration = `${decorationPrefix} ${courseNum}`;
        const { start, end } = parsePeriod(period);

        console.log(`\n✔ Matched image "${file}" to:`);
        console.log(`  Name: ${name} | Category: ${dbCategory} | Score: ${(bestScore * 100).toFixed(1)}%`);

        // Check if database contains this record
        // Try exact match first
        let dbRow = db.prepare("SELECT id, name, category, image_url FROM personnel WHERE name = ? AND category = ?").get(name, dbCategory);

        // If not found, try flexible match against all DB personnel of that category
        if (!dbRow) {
          const dbRowsOfCategory = db.prepare("SELECT id, name, category, image_url FROM personnel WHERE category = ?").all(dbCategory);
          let bestDbRow = null;
          let bestDbScore = 0;

          const jsonTokens = tokenizeAndClean(name);
          for (const row of dbRowsOfCategory) {
            const dbTokens = tokenizeAndClean(row.name);
            const score = getMatchScore(dbTokens, jsonTokens);
            if (score > bestDbScore) {
              bestDbScore = score;
              bestDbRow = row;
            }
          }

          if (bestDbRow && bestDbScore >= 0.85) {
            dbRow = bestDbRow;
            console.log(`  Flexible matched in DB: "${dbRow.name}" (ID: ${dbRow.id})`);
          }
        } else {
          console.log(`  Exact matched in DB: (ID: ${dbRow.id})`);
        }

        let fellowId;

        if (dbRow) {
          // Update existing row
          db.prepare(`
            UPDATE personnel 
            SET image_url = ?, decoration = COALESCE(decoration, ?) 
            WHERE id = ?
          `).run(localUrl, defaultDecoration, dbRow.id);
          fellowId = dbRow.id;
          console.log(`  Updated database record.`);
        } else {
          // Insert new row
          const cleanCat = dbCategory.toLowerCase();
          const cleanSerial = serial ? String(serial).padStart(3, '0') : Math.random().toString(36).slice(2, 6);
          const newId = `p-${cleanCat}-local-${courseNum}-${cleanSerial}`;

          const citation = generateCitation(name, dbCategory, start, end);
          const detectedService = detectService(rank || "", name, file);

          db.prepare(`
            INSERT INTO personnel (id, name, rank, category, service, period_start, period_end, image_url, citation, decoration, seniority_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newId,
            name,
            rank || "",
            dbCategory,
            detectedService,
            start,
            end,
            localUrl,
            citation,
            defaultDecoration,
            serial || null
          );
          fellowId = newId;
          console.log(`  Inserted new database record. (ID: ${fellowId})`);
        }

        // Track successful match
        tracker.uploaded_files[trackerKey] = fellowId;
        fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));

        // Remove from unmatched if it was previously there
        unmatchedTracker.unmatched_files = unmatchedTracker.unmatched_files.filter(f => f !== trackerKey);
        fs.writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatchedTracker, null, 2));

      } else {
        console.warn(`\n⚠ WARNING: No JSON match found for image "${file}" in Course ${courseNum}.`);
        if (!unmatchedTracker.unmatched_files.includes(trackerKey)) {
          unmatchedTracker.unmatched_files.push(trackerKey);
          fs.writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatchedTracker, null, 2));
        }
      }
    }
  }
})();

db.close();
console.log('\nSUCCESS: Database update and tracking file updated successfully!');
process.exit(0);
