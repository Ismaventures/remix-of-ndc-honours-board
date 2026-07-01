const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

// Global crash handlers — setup early to catch require errors (like native modules)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const LOG_FILE = isDev ? null : path.join(app.getPath('userData'), 'crash.log');
function logToFile(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  if (LOG_FILE) {
    try {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      fs.appendFileSync(LOG_FILE, line);
    } catch (_) {}
  }
}

process.on('uncaughtException', (err) => {
  try {
    console.error('UNCAUGHT EXCEPTION:', err);
    logToFile('UNCAUGHT EXCEPTION: ' + err.stack);
  } catch (_) {}
});
process.on('unhandledRejection', (reason) => {
  try {
    console.error('UNHANDLED REJECTION:', reason);
    logToFile('UNHANDLED REJECTION: ' + String(reason));
  } catch (_) {}
});

// Now import native and sync modules
const Database = require('better-sqlite3');
const driveSync = require('./dropboxSync.cjs');

const APP_PATH = app.getAppPath();
const UNPACKED_PATH = isDev ? APP_PATH : APP_PATH.replace('app.asar', 'app.asar.unpacked');

// In production, database.sqlite and local_media live in the application's Resources folder.
const LOCAL_DATA_ROOT = isDev
  ? process.cwd()
  : process.resourcesPath;

const LOCAL_MEDIA_DIR = path.join(LOCAL_DATA_ROOT, 'local_media');
const DB_PATH = path.join(LOCAL_DATA_ROOT, 'database.sqlite');

// Register local-media protocol privileges
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true, corsEnabled: true, standard: true } }
]);

let db;

function initializeDatabase() {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Create local auth users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS local_users (
      email TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      user_id TEXT NOT NULL
    )
  `).run();

  // Seed default admin user if not exists
  db.prepare(`
    INSERT OR IGNORE INTO local_users (email, password, user_id)
    VALUES ('admin@ndc.gov.ng', 'NDC_admin_2026!', 'admin-uuid-123')
  `).run();

  // Read and run schema definitions from supabase_schema.sql
  const schemaSqlPath = path.join(APP_PATH, 'supabase_schema.sql');
  if (fs.existsSync(schemaSqlPath)) {
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    const statements = schemaSql.split(';');
    
    db.transaction(() => {
      for (let stmt of statements) {
        // Strip comments and format
        stmt = stmt.split(/\r?\n/).map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
        if (!stmt) continue;

        // Skip PG-specific policies, RLS, and storage functions
        if (
          stmt.startsWith('ALTER TABLE') && (
            stmt.includes('ENABLE ROW LEVEL SECURITY') || 
            stmt.includes('OWNER TO')
          )
        ) continue;
        if (stmt.startsWith('DROP POLICY') || stmt.startsWith('CREATE POLICY')) continue;
        if (stmt.includes('storage.buckets') || stmt.includes('storage.objects')) continue;
        if (stmt.includes('auth.users')) {
          stmt = stmt.replace(/REFERENCES auth\.users\(id\)( ON DELETE CASCADE| ON DELETE SET NULL)?/g, '');
        }

        // Convert PG types to SQLite types
        stmt = stmt.replace(/timestamptz/g, 'TEXT');
        stmt = stmt.replace(/bigserial/g, 'INTEGER');
        stmt = stmt.replace(/double precision/g, 'REAL');
        stmt = stmt.replace(/jsonb/g, 'TEXT');
        stmt = stmt.replace(/text\[\]/g, 'TEXT');
        stmt = stmt.replace(/now\(\)/g, 'CURRENT_TIMESTAMP');
        stmt = stmt.replace(/DEFAULT gen_random_uuid\(\)/ig, '');
        stmt = stmt.replace(/uuid/g, 'TEXT');

        // Clean up Postgres type castings (e.g., ::text, ::jsonb, ::uuid)
        stmt = stmt.replace(/::[a-zA-Z0-9_]+(\[\])?/g, '');
        // Replace Postgres-specific array string defaults '{}' with standard JSON array '[]'
        stmt = stmt.replace(/'\{\}'/g, "'[]'");

        if (stmt.toUpperCase().includes('CREATE TABLE') || stmt.toUpperCase().includes('CREATE INDEX')) {
          try {
            db.prepare(stmt).run();
          } catch (err) {
            console.error('Failed to run schema statement:', stmt, err.message);
          }
        }
      }
    })();
    console.log('SQLite database tables initialized.');
  }

  // Seed default CMS records if empty
  const migrationSqlPath = path.join(APP_PATH, 'supabase_cms_migration.sql');
  if (fs.existsSync(migrationSqlPath)) {
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
    const statements = migrationSql.split(';');

    // Run CREATE TABLE, CREATE INDEX, and ALTER TABLE commands to ensure all CMS schemas exist
    db.transaction(() => {
      for (let stmt of statements) {
        // Strip comments and format
        stmt = stmt.split(/\r?\n/).map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
        if (!stmt) continue;

        // Skip PG-specific policies, RLS, and storage functions
        if (
          stmt.startsWith('ALTER TABLE') && (
            stmt.includes('ENABLE ROW LEVEL SECURITY') || 
            stmt.includes('OWNER TO')
          )
        ) continue;
        if (stmt.startsWith('DROP POLICY') || stmt.startsWith('CREATE POLICY')) continue;
        if (stmt.includes('storage.buckets') || stmt.includes('storage.objects')) continue;
        if (stmt.includes('auth.users')) {
          stmt = stmt.replace(/REFERENCES auth\.users\(id\)( ON DELETE CASCADE| ON DELETE SET NULL)?/g, '');
        }

        // Convert PG types to SQLite types
        stmt = stmt.replace(/timestamptz/g, 'TEXT');
        stmt = stmt.replace(/bigserial/g, 'INTEGER');
        stmt = stmt.replace(/double precision/g, 'REAL');
        stmt = stmt.replace(/jsonb/g, 'TEXT');
        stmt = stmt.replace(/text\[\]/g, 'TEXT');
        stmt = stmt.replace(/now\(\)/g, 'CURRENT_TIMESTAMP');
        stmt = stmt.replace(/DEFAULT gen_random_uuid\(\)/ig, '');
        stmt = stmt.replace(/uuid/g, 'TEXT');

        // Clean up Postgres type castings
        stmt = stmt.replace(/::[a-zA-Z0-9_]+(\[\])?/g, '');
        // Replace Postgres-specific array string defaults
        stmt = stmt.replace(/'\{\}'/g, "'[]'");

        if (stmt.startsWith('ALTER TABLE')) {
          stmt = stmt.replace(/ADD COLUMN IF NOT EXISTS/ig, 'ADD COLUMN');
          try {
            db.prepare(stmt).run();
          } catch (err) {
            if (!err.message.includes('duplicate column')) {
              console.error('Failed to run migration schema update:', stmt, err.message);
            }
          }
        } else if (stmt.toUpperCase().includes('CREATE TABLE') || stmt.toUpperCase().includes('CREATE INDEX')) {
          try {
            db.prepare(stmt).run();
          } catch (err) {
            console.error('Failed to run migration CREATE statement:', stmt, err.message);
          }
        }
      }
    })();

    const rowCount = db.prepare("SELECT COUNT(*) as count FROM museum_artifacts").get();
    if (rowCount.count === 0) {
      console.log('Seeding default CMS database records...');
      db.transaction(() => {
        for (let stmt of statements) {
          stmt = stmt.trim();
          if (!stmt) continue;
          if (stmt.startsWith('INSERT INTO')) {
            // Translate Postgres arrays like '{}'::text[] or '{"url"}'::text[] to SQLite JSON strings
            stmt = stmt.replace(/'\{([^}]*)\}'::text\[\]/g, (match, content) => {
              if (!content.trim()) return "'[]'";
              const items = content.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
              return `'${JSON.stringify(items)}'`;
            });
            stmt = stmt.replace(/'\{\}'::text\[\]/g, "'[]'");

            try {
              db.prepare(stmt).run();
            } catch (err) {
              console.error('Failed to run migration seed:', stmt, err.message);
            }
          }
        }
      })();
    }
  }

  // Seed personnel records if empty
  const personnelCount = db.prepare("SELECT COUNT(*) as count FROM personnel").get();
  if (personnelCount.count === 0) {
    console.log('Seeding default personnel records...');
    const seedSqlPath = path.join(APP_PATH, 'nwc_personnel_sql_seed_trackable.sql');
    if (fs.existsSync(seedSqlPath)) {
      const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
      const statements = seedSql.split(';');
      db.transaction(() => {
        for (let stmt of statements) {
          stmt = stmt.trim();
          if (!stmt) continue;
          if (stmt.startsWith('INSERT INTO')) {
            stmt = stmt.replace(/::uuid/g, '');
            try {
              db.prepare(stmt).run();
            } catch (err) {
              console.error('Failed to run personnel seed:', stmt, err.message);
            }
          }
        }
      })();
    }
  }

  // Heal database duplicates and correct categories on startup
  healDatabase(db);
}

function healDatabase(db) {
  console.log('Running database healing and deduplication...');
  let madeChanges = false;
  try {
    db.transaction(() => {
      // 1. Delete duplicate records where name is similar and one has no image
      const personnel = db.prepare("SELECT id, name, category, image_url, decoration, period_start FROM personnel").all();
      
      const groups = {};
      const cleanName = (n) => n.replace(/[^a-zA-Z]/g, '').toLowerCase();
      
      for (const p of personnel) {
        const key = cleanName(p.name);
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      }
      
      for (const key in groups) {
        const list = groups[key];
        if (list.length > 1) {
          console.log(`[Heal] Found duplicates for normalized name "${key}":`, list.map(x => `${x.name} (ID: ${x.id}, Cat: ${x.category}, Img: ${x.image_url ? 'Yes' : 'No'})`));
          
          // Find if one has a valid image_url
          const withImage = list.find(x => x.image_url && x.image_url.startsWith('local-media://'));
          
          if (withImage) {
            // Keep the one with the image, delete the others
            for (const item of list) {
              if (item.id !== withImage.id) {
                db.prepare("DELETE FROM personnel WHERE id = ?").run(item.id);
                madeChanges = true;
                console.log(`[Heal] Deleted duplicate/broken personnel record: ${item.name} (${item.id}) category: ${item.category}`);
              }
            }
          } else {
            // If none have images, keep the first one and delete the rest
            const keep = list[0];
            for (let i = 1; i < list.length; i++) {
              db.prepare("DELETE FROM personnel WHERE id = ?").run(list[i].id);
              madeChanges = true;
              console.log(`[Heal] Deleted duplicate/empty personnel record: ${list[i].name} (${list[i].id}) category: ${list[i].category}`);
            }
          }
        }
      }
      
      // 2. Correct categories based on course numbers
      // Course-1 to Course-15 MUST be FWC
      // Course-16 to Course-34 MUST be FDC
      const allPersonnel = db.prepare("SELECT id, name, category, decoration, period_start FROM personnel").all();
      for (const p of allPersonnel) {
        let courseNum = null;
        if (p.decoration) {
          let match = p.decoration.match(/CSE\s*(\d+)/i) || p.decoration.match(/NWC\s+Course\s+(\d+)/i) || p.decoration.match(/Course\s+(\d+)/i);
          if (match) courseNum = parseInt(match[1], 10);
        }
        if (!courseNum && p.period_start) {
          courseNum = p.period_start - 1991;
        }
        
        if (courseNum && !isNaN(courseNum)) {
          const correctCategory = courseNum <= 15 ? 'FWC' : 'FDC';
          if (p.category !== correctCategory && p.category !== 'Allied' && p.category !== 'Directing Staff') {
            db.prepare("UPDATE personnel SET category = ? WHERE id = ?").run(correctCategory, p.id);
            madeChanges = true;
            console.log(`[Heal] Corrected category for ${p.name} (${p.id}) from ${p.category} to ${correctCategory}`);
          }
        }
      }
    })();
    console.log('Database healing and deduplication complete.');
  } catch (err) {
    console.error('Failed to heal database:', err);
  }
  return madeChanges;
}

// Columns that contain serialized JSON or Array values
const JSON_COLUMNS = {
  museum_artifacts: ['media_urls', 'tags', 'related_artifact_ids', 'image_settings'],
  ui_settings: ['setting_value'],
  shared_ui_settings: ['setting_value'],
  device_control_commands: ['payload'],
  global_site_control: ['payload'],
  museum_collection_wings: ['highlights'],
  museum_tour_routes: ['stops'],
  commandants: ['education', 'training', 'past_appointments', 'honours']
};

function parseRowJsonColumns(table, row) {
  if (!row) return row;
  const cols = JSON_COLUMNS[table];
  if (!cols) return row;

  const parsed = { ...row };
  for (const col of cols) {
    if (parsed[col] !== undefined && typeof parsed[col] === 'string') {
      try {
        parsed[col] = JSON.parse(parsed[col]);
      } catch (err) {
        // Fallback
      }
    }
  }
  return parsed;
}

function serializeRowJsonColumns(table, row) {
  if (!row) return row;
  const cols = JSON_COLUMNS[table];
  if (!cols) return row;

  const serialized = { ...row };
  for (const col of cols) {
    if (serialized[col] !== undefined && typeof serialized[col] !== 'string') {
      serialized[col] = JSON.stringify(serialized[col]);
    }
  }
  return serialized;
}

function normalizeSqliteValue(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

function createWindow() {
  // In production the preload script is unpacked from ASAR to the real filesystem
  // so the sandbox bundler can read it without byte-offset corruption.
  // Fallback to reading from ASAR if unpacked version doesn't exist.
  const unpackedPreload = path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'preload.cjs');
  const asarPreload = path.join(APP_PATH, 'electron', 'preload.cjs');
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.cjs')
    : (fs.existsSync(unpackedPreload) ? unpackedPreload : asarPreload);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setMenuBarVisibility(false);

  // Allow opening DevTools with F12 / Cmd+Alt+I in production for debugging
  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      (input.meta && input.alt && input.key.toLowerCase() === 'i') ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Forward renderer console messages to main terminal output
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (from ${path.basename(sourceId)}:${line})`);
  });

  if (isDev) {
    win.loadURL('http://127.0.0.1:8080');
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // errorCode -102 is ERR_CONNECTION_REFUSED
      if (validatedURL.startsWith('http://127.0.0.1:8080')) {
        setTimeout(() => {
          if (!win.isDestroyed()) {
            win.loadURL('http://127.0.0.1:8080');
          }
        }, 1000);
      }
    });
  } else {
    win.loadFile(path.join(APP_PATH, 'dist', 'index.html'));
  }
}

function parseLocalMediaPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname;
    const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (host && host !== 'local-media') {
      return pathname ? `${host}/${pathname}` : host;
    }
    return pathname;
  } catch (_) {
    let filePath = rawUrl.slice('local-media://'.length);
    if (filePath.startsWith('/')) filePath = filePath.slice(1);
    return decodeURIComponent(filePath);
  }
}

function resolveBundledAssetPath(...segments) {
  // In production, extraResources places files directly in process.resourcesPath
  const candidates = [
    path.join(process.resourcesPath, ...segments),
    path.join(UNPACKED_PATH, ...segments),
    path.join(APP_PATH, ...segments),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Copy files from src to dest recursively, but only if the file doesn't
 * already exist at the destination. This is non-destructive and safe to
 * call on every startup to pick up newly bundled assets.
 */
function copyMissingFiles(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyMissingFiles(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      try {
        const fileContent = fs.readFileSync(srcPath);
        fs.writeFileSync(destPath, fileContent);
        console.log(`Copied missing asset: ${entry.name}`);
      } catch (err) {
        console.error(`Failed to copy asset ${entry.name}:`, err);
      }
    }
  }
}

function mergeTableUpdates(bundledDb, targetDb, tableName) {
  try {
    // Only attempt merge if table exists in both databases
    const bundledTableExists = bundledDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    const targetTableExists = targetDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (!bundledTableExists || !targetTableExists) return;

    // Check if table has an 'id' column
    const hasId = bundledDb.prepare(`PRAGMA table_info(${tableName})`).all().some(col => col.name === 'id');
    if (!hasId) return;

    const records = bundledDb.prepare(`SELECT * FROM ${tableName}`).all();
    if (records.length === 0) return;
    
    // Get columns to build INSERT query dynamically
    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    
    const checkStmt = targetDb.prepare(`SELECT 1 FROM ${tableName} WHERE id = ?`);
    const insertStmt = targetDb.prepare(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`);
    
    // We only update image_url for existing records (and only if missing)
    let updateStmt = null;
    if (columns.includes('image_url')) {
      updateStmt = targetDb.prepare(
        `UPDATE ${tableName} SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '' OR image_url NOT LIKE 'local-media://%')`
      );
    }

    let insertedCount = 0;
    let updatedCount = 0;

    targetDb.transaction(() => {
      for (const row of records) {
        const exists = checkStmt.get(row.id);
        if (exists) {
          if (updateStmt && row.image_url && row.image_url !== '') {
            const info = updateStmt.run(row.image_url, row.id);
            if (info.changes > 0) updatedCount++;
          }
        } else {
          // Exclude any columns from the insert that don't exist in target DB
          // (To be perfectly safe, we'll just insert what we got from bundled DB)
          const values = columns.map(col => row[col]);
          try {
            insertStmt.run(...values);
            insertedCount++;
          } catch (insertErr) {
            // If schema mismatch, log it
            logToFile(`Failed to insert record into ${tableName}: ` + insertErr.message);
          }
        }
      }
    })();
    
    if (insertedCount > 0 || updatedCount > 0) {
      logToFile(`Merged ${tableName}: inserted ${insertedCount}, updated ${updatedCount} image references.`);
    }
  } catch (err) {
    logToFile(`Failed to merge table ${tableName}: ` + err.message);
  }
}

/**
 * Merge updated image_url references and entirely new records from the bundled (read-only) database
 * into the user's writable database. This ensures that when a new app version
 * ships with updated content, those updates are propagated even though
 * the user's database already exists and won't be overwritten.
 */
function mergeDatabaseUpdates(bundledDbPath, userDbPath) {
  if (!fs.existsSync(bundledDbPath) || !fs.existsSync(userDbPath) || !db) return;
  try {
    const bundledDb = new Database(bundledDbPath, { readonly: true });

    // Core tables that should have their missing records synced from bundle to user DB
    const tablesToSync = [
      'personnel', 'commandants', 'visits', 
      'museum_artifacts', 'museum_tours', 'museum_tour_steps', 
      'museum_sections', 'museum_about_items', 'museum_collection_wings', 
      'museum_tour_routes', 'audio_tracks'
    ];
    
    for (const table of tablesToSync) {
      mergeTableUpdates(bundledDb, db, table);
    }
    bundledDb.close();
  } catch (err) {
    logToFile('Failed to merge database updates: ' + err.message);
  }
}

function copyDirRecursive(src, dest, overwrite = false) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, overwrite);
    } else {
      if (overwrite || !fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (e) {
          logToFile(`Failed to copy file ${srcPath} to ${destPath}: ` + e.message);
        }
      }
    }
  }
}

app.whenReady().then(() => {
  logToFile('=== NDC Honours Board Startup ===');
  logToFile('isDev: ' + isDev);
  logToFile('APP_PATH: ' + APP_PATH);
  logToFile('UNPACKED_PATH: ' + UNPACKED_PATH);
  logToFile('LOCAL_MEDIA_DIR: ' + LOCAL_MEDIA_DIR);
  logToFile('DB_PATH: ' + DB_PATH);
  if (!isDev) {
    logToFile('resourcesPath: ' + process.resourcesPath);
  }

  if (!isDev) {
    const mediaExists = fs.existsSync(LOCAL_MEDIA_DIR);
    const dbExists = fs.existsSync(DB_PATH);
    logToFile('local_media exists at resourcesPath: ' + mediaExists);
    logToFile('database.sqlite exists at resourcesPath: ' + dbExists);
    if (mediaExists) {
      try {
        const topLevelEntries = fs.readdirSync(LOCAL_MEDIA_DIR);
        logToFile('local_media top-level entries: ' + JSON.stringify(topLevelEntries));
      } catch (e) {
        logToFile('Could not list local_media: ' + e.message);
      }
    }
  }

  // Ensure local media directory exists (in case extraResources didn't include it)
  if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
    fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
  }

  logToFile('Calling initializeDatabase()...');
  try {
    initializeDatabase();
    logToFile('initializeDatabase() completed.');
  } catch (err) {
    console.error('FATAL: initializeDatabase() failed:', err);
    logToFile('FATAL: initializeDatabase() failed: ' + err.stack);
    app.quit();
    return;
  }

  logToFile('Registering protocol handler...');
  // Register modern protocol handle for local-media:// BEFORE creating window.
  // First check the writable userData directory, then fall back to the
  // read-only bundled assets inside APP_PATH.
  protocol.handle('local-media', async (request) => {
    const rawUrl = request.url;
    const decodedPath = parseLocalMediaPath(rawUrl);

    console.log(`[local-media] RAW URL: ${rawUrl}`);
    console.log(`[local-media] Decoded path: ${decodedPath}`);

    // Recursively resolve all parts of a relative path case-insensitively
    const caseNormalizePath = (baseDir, relativePath) => {
      const parts = relativePath.split(/[/\\]/).filter(Boolean);
      let currentDir = baseDir;
      const normalizedParts = [];

      for (const part of parts) {
        if (!fs.existsSync(currentDir)) {
          normalizedParts.push(part);
          continue;
        }
        try {
          const files = fs.readdirSync(currentDir);
          const matched = files.find(f => f.toLowerCase() === part.toLowerCase());
          if (matched) {
            normalizedParts.push(matched);
            currentDir = path.join(currentDir, matched);
          } else {
            console.log(`[local-media] No match for segment "${part}" in ${currentDir}. Available: ${files.join(', ')}`);
            normalizedParts.push(part);
            currentDir = path.join(currentDir, part);
          }
        } catch (e) {
          normalizedParts.push(part);
          currentDir = path.join(currentDir, part);
        }
      }
      return normalizedParts.length > 0 ? path.join(...normalizedParts) : relativePath;
    };

    const normalizedPath = caseNormalizePath(LOCAL_MEDIA_DIR, decodedPath);
    const userPath = path.join(LOCAL_MEDIA_DIR, normalizedPath);

    console.log(`[local-media] Normalized path: ${normalizedPath}`);
    console.log(`[local-media] Full user path: ${userPath}`);
    console.log(`[local-media] User path exists: ${fs.existsSync(userPath)}`);

    const getMimeType = (p) => {
      const ext = path.extname(p).toLowerCase();
      if (ext === '.png') return 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
      if (ext === '.gif') return 'image/gif';
      if (ext === '.svg') return 'image/svg+xml';
      if (ext === '.webp') return 'image/webp';
      if (ext === '.mp3') return 'audio/mpeg';
      if (ext === '.wav') return 'audio/wav';
      if (ext === '.ogg') return 'audio/ogg';
      return 'application/octet-stream';
    };

    // Try the primary local_media directory (resourcesPath in production, cwd in dev)
    if (fs.existsSync(userPath)) {
      try {
        const fileContent = await fs.promises.readFile(userPath);
        console.log(`[local-media] SUCCESS: ${userPath} (${fileContent.length} bytes)`);
        return new Response(fileContent, {
          headers: { 'content-type': getMimeType(userPath) }
        });
      } catch (err) {
        console.error(`[local-media] Error reading from userData ${userPath}:`, err);
      }
    }

    // Fallback to read-only bundled assets: first try asarUnpacked, then inside the ASAR itself.
    if (!isDev) {
      const searchPaths = [
        path.join(UNPACKED_PATH, 'local_media'),
        path.join(APP_PATH, 'local_media'),
      ];
      for (const bundledMediaDir of searchPaths) {
        const bundledNormalizedPath = caseNormalizePath(bundledMediaDir, decodedPath);
        const bundledPath = path.join(bundledMediaDir, bundledNormalizedPath);
        if (fs.existsSync(bundledPath)) {
          try {
            const fileContent = await fs.promises.readFile(bundledPath);
            return new Response(fileContent, {
              headers: { 'content-type': getMimeType(bundledPath) }
            });
          } catch (err) {
            console.error(`[local-media] Error reading from bundle ${bundledPath}:`, err);
          }
        }
      }
    }

    // Default: Return 404 Response if file does not exist
    logToFile(`[local-media] 404 NOT FOUND: rawUrl=${rawUrl}, decodedPath=${decodedPath}, userPath=${userPath}, exists=${fs.existsSync(userPath)}`);
    console.error(`[local-media] 404 NOT FOUND: ${decodedPath}`);
    return new Response('Not Found', { status: 404 });
  });

  // In production, intercept file:// requests for absolute paths like /images/...
  // and serve them from dist/ inside the app package. This is needed because many
  // React components use runtime string literals (e.g. "/images/ndc-crest.png")
  // which Vite doesn't rewrite to relative paths at build time.
  if (!isDev) {
    protocol.interceptFileProtocol('file', (request, callback) => {
      let url = request.url;
      // Convert file:// URL to a local path
      let filePath = decodeURIComponent(new URL(url).pathname);

      // On Windows, pathname may start with /C:/... — strip leading slash
      if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }

      // Only intercept requests that are absolute to the root of the file system (starting with /images/ or are public assets at root)
      // This prevents matching parent directory names containing the word "images".
      const isAbsolutePublicAsset = 
        filePath.startsWith('/images/') || 
        filePath === '/placeholder.svg' || 
        filePath === '/favicon.ico' || 
        filePath === '/robots.txt' ||
        (process.platform === 'win32' && (
          /^[a-zA-Z]:[/\\]images[/\\]/i.test(filePath) ||
          /^[a-zA-Z]:[/\\]placeholder\.svg$/i.test(filePath) ||
          /^[a-zA-Z]:[/\\]favicon\.ico$/i.test(filePath) ||
          /^[a-zA-Z]:[/\\]robots\.txt$/i.test(filePath)
        ));

      if (isAbsolutePublicAsset) {
        let assetRelative = filePath;
        if (process.platform === 'win32' && /^[a-zA-Z]:/.test(assetRelative)) {
          assetRelative = assetRelative.slice(2);
        }
        assetRelative = assetRelative.replace(/^\/+/, '').replace(/\\/g, '/');
        const assetPath = path.join(APP_PATH, 'dist', assetRelative);
        callback({ path: assetPath });
        return;
      }

      // For all other file:// requests, pass through normally
      callback({ path: filePath });
    });
  }

  // Ensure the CMS version metadata file exists with at least version 1
  // so that version-based Dropbox sync comparison works from the start.
  if (readLocalSchemaVersion() === 0) {
    updateLocalCmsTimestamp();
  }

  logToFile('Protocol handlers registered. Creating window...');
  createWindow();
  logToFile('createWindow() called.');

  // Background Dropbox sync — pull any newer files from Dropbox on startup.
  // This MUST run before downloadRemoteAssets so that the database is up-to-date
  // before we start resolving image references to local files.
  setTimeout(async () => {
    try {
      const status = await driveSync.getAuthStatus();
      if (status.authenticated) {
        logToFile('Dropbox authenticated — starting background pull...');

        const onBeforeDbDownload = () => {
          if (db) {
            logToFile('Closing database for background Dropbox pull (db download)...');
            db.close();
            db = null;
          }
        };

        const onAfterDbDownload = () => {
          logToFile('Re-initializing database after background Dropbox pull (db download)...');
          initializeDatabase();
        };

        try {
          const result = await driveSync.pullFromCloud(LOCAL_MEDIA_DIR, DB_PATH, null, onBeforeDbDownload, onAfterDbDownload);
          logToFile('Dropbox pull complete: downloaded=' + (result.downloaded || 0) + ' skipped=' + (result.skipped || 0));
          
          if (result && result.dbDownloaded) {
            logToFile('Reloading renderer window after background startup sync pull...');
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
              if (!win.isDestroyed()) {
                win.webContents.executeJavaScript(`
                  location.reload();
                `);
              }
            }
          }
        } catch (err) {
          logToFile('Error during background startup sync pull: ' + err.message);
        }
      } else {
        logToFile('Dropbox not authenticated — skipping background sync.');
      }
    } catch (err) {
      logToFile('Background Dropbox pull check failed: ' + err.message);
    }

    // Trigger background remote assets download and local migration AFTER Dropbox sync.
    // This ensures image URL rewrites to local-media:// happen after the DB is current,
    // and the version bump prevents the next sync from undoing these changes.
    try {
      await downloadRemoteAssets();
      updateLocalCmsTimestamp();
      logToFile('Background remote assets download and version bump complete.');
    } catch (err) {
      console.error('Background assets download check failed:', err);
    }
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const tableColumnsCache = {};
function getTableColumns(tableName) {
  if (!db) return null;
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
    if (columns.length > 0) {
      tableColumnsCache[tableName] = columns;
      return columns;
    }
  } catch (err) {
    console.error(`Failed to get columns for table ${tableName}:`, err);
  }
  return null;
}

function filterRecordToTableColumns(tableName, record) {
  if (!record || typeof record !== 'object') return record;
  const cols = getTableColumns(tableName);
  if (!cols) return record;
  const filtered = {};
  for (const key of Object.keys(record)) {
    if (cols.includes(key)) {
      filtered[key] = record[key];
    }
  }
  return filtered;
}

function readLocalSchemaVersion() {
  const metadataPath = path.join(LOCAL_DATA_ROOT, 'database-metadata.json');
  if (!fs.existsSync(metadataPath)) return 0;
  try {
    const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return Math.max(meta.schemaVersion || 0, meta.cmsLastModified || 0);
  } catch {
    return 0;
  }
}

function updateLocalCmsTimestamp() {
  const metadataPath = path.join(LOCAL_DATA_ROOT, 'database-metadata.json');
  const currentVersion = readLocalSchemaVersion();
  const newVersion = currentVersion + 1;
  const data = { cmsLastModified: Date.now(), schemaVersion: newVersion };
  fs.mkdirSync(path.dirname(metadataPath), { recursive: true });
  fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
  logToFile(`[AutoSync] Updated CMS version from ${currentVersion} to ${newVersion}`);
}

function handleDbMutationTrigger(table) {
  const SYNCABLE_TABLES = ['personnel', 'commandants', 'visits'];
  if (SYNCABLE_TABLES.includes(table)) {
    updateLocalCmsTimestamp();
    triggerAutoSync();
  }
}

let autoSyncTimeout = null;
let isAutoSyncRunning = false;
function triggerAutoSync() {
  if (autoSyncTimeout) {
    clearTimeout(autoSyncTimeout);
  }
  autoSyncTimeout = setTimeout(async () => {
    if (isAutoSyncRunning) {
      logToFile('[AutoSync] Sync already in progress, rescheduling...');
      triggerAutoSync();
      return;
    }
    try {
      isAutoSyncRunning = true;
      const status = await driveSync.getAuthStatus();
      if (!status || !status.authenticated) {
        logToFile('[AutoSync] Skipping sync push: Dropbox not authenticated. Data was saved locally but will not be synced to cloud.');
        return;
      }
      logToFile('[AutoSync] Starting auto-sync push to Dropbox...');

      const onBeforeDbDownload = () => {
        if (db) {
          logToFile('[AutoSync] Closing database before download...');
          db.close();
          db = null;
        }
      };

      const onAfterDbDownload = () => {
        logToFile('[AutoSync] Re-initializing database after download...');
        initializeDatabase();
      };

      const result = await driveSync.syncAuto(LOCAL_MEDIA_DIR, DB_PATH, null, onBeforeDbDownload, onAfterDbDownload);

      logToFile(`[AutoSync] Auto-sync complete. Uploaded: ${result.uploaded}, Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Deleted: ${result.deleted}`);

      if (result && result.dbDownloaded) {
        logToFile('[AutoSync] Database was updated from remote during auto-sync. Reloading windows...');
        const wins = BrowserWindow.getAllWindows();
        for (const w of wins) {
          if (!w.isDestroyed()) {
            w.webContents.executeJavaScript(`
              location.reload();
            `);
          }
        }
      }
    } catch (err) {
      logToFile('[AutoSync] Auto-sync push failed: ' + err.message);
    } finally {
      isAutoSyncRunning = false;
    }
  }, 2000); // 2 seconds debounce
}

// IPC handler for SQLite queries
ipcMain.handle('query-sqlite', async (event, queryDesc) => {
  if (!db) {
    return { data: null, error: 'Database not yet initialized' };
  }
  const { table, method, fields, payload, filters, order, range } = queryDesc;
  
  // Helper to build SQL WHERE clauses for all filter types
  function buildWhereClause(filtersList, paramsArray) {
    const clauses = [];
    for (const filter of (filtersList || [])) {
      if (filter.type === 'eq') {
        if (filter.value === null) {
          clauses.push(`${filter.column} IS NULL`);
        } else {
          clauses.push(`${filter.column} = ?`);
          paramsArray.push(filter.value);
        }
      } else if (filter.type === 'neq') {
        if (filter.value === null) {
          clauses.push(`${filter.column} IS NOT NULL`);
        } else {
          clauses.push(`${filter.column} != ?`);
          paramsArray.push(filter.value);
        }
      } else if (filter.type === 'gt') {
        clauses.push(`${filter.column} > ?`);
        paramsArray.push(filter.value);
      } else if (filter.type === 'gte') {
        clauses.push(`${filter.column} >= ?`);
        paramsArray.push(filter.value);
      } else if (filter.type === 'lt') {
        clauses.push(`${filter.column} < ?`);
        paramsArray.push(filter.value);
      } else if (filter.type === 'lte') {
        clauses.push(`${filter.column} <= ?`);
        paramsArray.push(filter.value);
      } else if (filter.type === 'like') {
        clauses.push(`${filter.column} LIKE ?`);
        paramsArray.push(filter.value);
      } else if (filter.type === 'in') {
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map(() => '?').join(',');
          clauses.push(`${filter.column} IN (${placeholders})`);
          paramsArray.push(...filter.value);
        } else {
          clauses.push('1 = 0');
        }
      } else if (filter.type === 'not_in') {
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          const placeholders = filter.value.map(() => '?').join(',');
          clauses.push(`${filter.column} NOT IN (${placeholders})`);
          paramsArray.push(...filter.value);
        }
      }
    }
    return clauses;
  }

  try {
    if (method === 'select') {
      let sql = `SELECT ${fields || '*'} FROM ${table}`;
      const params = [];
      const whereClauses = buildWhereClause(filters, params);

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (order) {
        sql += ` ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}`;
      }

      if (range) {
        const limit = range.to - range.from + 1;
        const offset = range.from;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      const parsedRows = rows.map(row => parseRowJsonColumns(table, row));
      return { data: parsedRows, error: null };
    }

    if (method === 'insert') {
      const records = Array.isArray(payload) ? payload : [payload];
      const inserted = [];

      db.transaction(() => {
        for (const record of records) {
          const filteredRecord = filterRecordToTableColumns(table, record);
          const serializedRecord = serializeRowJsonColumns(table, filteredRecord);
          const keys = Object.keys(serializedRecord);
          const placeholders = keys.map(() => '?').join(',');
          const values = Object.values(serializedRecord).map(normalizeSqliteValue);

          const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
          db.prepare(sql).run(...values);
          inserted.push(record);
        }
      })();

      handleDbMutationTrigger(table);
      return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
    }

    if (method === 'update') {
      const filteredPayload = filterRecordToTableColumns(table, payload);
      const serializedPayload = serializeRowJsonColumns(table, filteredPayload);
      const setKeys = Object.keys(serializedPayload);
      const setClauses = setKeys.map(k => `${k} = ?`).join(',');
      const params = Object.values(serializedPayload).map(normalizeSqliteValue);

      let sql = `UPDATE ${table} SET ${setClauses}`;
      const whereClauses = buildWhereClause(filters, params);

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const stmt = db.prepare(sql);
      const info = stmt.run(...params);

      handleDbMutationTrigger(table);
      return { data: info.changes > 0 ? [payload] : [], error: null };
    }

    if (method === 'delete') {
      let sql = `DELETE FROM ${table}`;
      const params = [];
      const whereClauses = buildWhereClause(filters, params);

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const stmt = db.prepare(sql);
      const info = stmt.run(...params);

      handleDbMutationTrigger(table);
      return { data: info.changes > 0 ? [{ id: 'deleted' }] : [], error: null };
    }

    if (method === 'upsert') {
      const records = Array.isArray(payload) ? payload : [payload];
      const upserted = [];

      db.transaction(() => {
        for (const record of records) {
          let conflictKey = 'id';
          if (table === 'device_clients') conflictKey = 'device_id';
          else if (table === 'audio_assignments') conflictKey = 'context';
          else if (table === 'shared_ui_settings') conflictKey = 'setting_key';
          else if (table === 'ui_settings') conflictKey = 'setting_key';
          
          let checkSql = '';
          let checkParams = [];

          if (table === 'ui_settings') {
            checkSql = `SELECT 1 FROM ${table} WHERE user_id = ? AND setting_key = ?`;
            checkParams = [record.user_id, record.setting_key];
          } else {
            checkSql = `SELECT 1 FROM ${table} WHERE ${conflictKey} = ?`;
            checkParams = [record[conflictKey]];
          }

          const existing = db.prepare(checkSql).get(...checkParams);
          const filteredRecord = filterRecordToTableColumns(table, record);
          
          if (existing) {
            const serializedRecord = serializeRowJsonColumns(table, filteredRecord);
            const setKeys = Object.keys(serializedRecord).filter(k => k !== conflictKey && k !== 'user_id');
            const setClauses = setKeys.map(k => `${k} = ?`).join(',');
            const values = setKeys.map(k => normalizeSqliteValue(serializedRecord[k]));

            let updateSql = `UPDATE ${table} SET ${setClauses} WHERE `;
            if (table === 'ui_settings') {
              updateSql += `user_id = ? AND setting_key = ?`;
              values.push(normalizeSqliteValue(record.user_id), normalizeSqliteValue(record.setting_key));
            } else {
              updateSql += `${conflictKey} = ?`;
              values.push(normalizeSqliteValue(record[conflictKey]));
            }

            db.prepare(updateSql).run(...values);
          } else {
            const serializedRecord = serializeRowJsonColumns(table, filteredRecord);
            const keys = Object.keys(serializedRecord);
            const placeholders = keys.map(() => '?').join(',');
            const values = Object.values(serializedRecord).map(normalizeSqliteValue);

            const insertSql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
            db.prepare(insertSql).run(...values);
          }
          upserted.push(record);
        }
      })();

      handleDbMutationTrigger(table);
      return { data: Array.isArray(payload) ? upserted : upserted[0], error: null };
    }
  } catch (err) {
    console.error(`Error executing ${method} on table ${table}:`, err);
    return { data: null, error: err.message || String(err) };
  }
});

// IPC handler for local media upload/save
ipcMain.handle('save-media', async (event, { bucketName, filePath, fileArray, fileType }) => {
  try {
    const buffer = Buffer.from(fileArray);
    const destPath = path.join(LOCAL_MEDIA_DIR, bucketName, filePath);
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    
    const publicUrl = `local-media://${bucketName}/${filePath}`;

    // Auto-push the new file and updated database to Dropbox in the background
    setTimeout(async () => {
      try {
        const relativePath = `local_media/${bucketName}/${filePath}`;
        await driveSync.pushSingleFile(destPath, relativePath);
        // Also push updated database after the media save settles
        if (fs.existsSync(DB_PATH)) {
          await driveSync.pushSingleFile(DB_PATH, 'database.sqlite');
        }
      } catch (err) {
        console.error('[DropboxSync] Auto-push after save-media failed:', err.message);
      }
    }, 500);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Failed to save media locally:', err);
    return { success: false, error: err.message || String(err) };
  }
});

// ── Dropbox Sync IPC Handlers ───────────────────────────────────────

ipcMain.handle('dropbox-auth', async () => {
  try {
    const result = await driveSync.authorize();
    return result;
  } catch (err) {
    console.error('[DropboxSync] Auth failed:', err.message);
    return { authenticated: false, error: err.message };
  }
});

ipcMain.handle('dropbox-sign-out', async () => {
  return driveSync.signOut();
});

ipcMain.handle('dropbox-auth-status', async () => {
  return driveSync.getAuthStatus();
});

ipcMain.handle('dropbox-push', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const progressCallback = (data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('dropbox-sync-progress', data);
      }
    };

    const onBeforeDbDownload = () => {
      if (db) {
        logToFile('Closing database for Dropbox push (db download)...');
        db.close();
        db = null;
      }
    };

    const onAfterDbDownload = () => {
      logToFile('Re-initializing database after Dropbox push (db download)...');
      initializeDatabase();
    };

    const result = await driveSync.pushToCloud(LOCAL_MEDIA_DIR, DB_PATH, progressCallback, onBeforeDbDownload, onAfterDbDownload);

    if (result && result.dbDownloaded) {
      logToFile('Reloading renderer window after database update during push...');
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (!w.isDestroyed()) {
          w.webContents.executeJavaScript(`
            location.reload();
          `);
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[DropboxSync] Push failed:', err);
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('dropbox-pull', async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const progressCallback = (data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('dropbox-sync-progress', data);
      }
    };

    const onBeforeDbDownload = () => {
      if (db) {
        logToFile('Closing database for Dropbox pull (db download)...');
        db.close();
        db = null;
      }
    };

    const onAfterDbDownload = () => {
      logToFile('Re-initializing database after Dropbox pull (db download)...');
      initializeDatabase();
    };

    const result = await driveSync.pullFromCloud(LOCAL_MEDIA_DIR, DB_PATH, progressCallback, onBeforeDbDownload, onAfterDbDownload);

    if (result && result.dbDownloaded) {
      logToFile('Reloading renderer window after database update during pull...');
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (!w.isDestroyed()) {
          w.webContents.executeJavaScript(`
            location.reload();
          `);
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[DropboxSync] Pull failed:', err);
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('dropbox-sync-status', async () => {
  return driveSync.getSyncStatus();
});

// IPC handlers for simulated authentication
ipcMain.handle('sign-in', async (event, { email, password }) => {
  try {
    const user = db.prepare('SELECT * FROM local_users WHERE email = ?').get(email);
    if (user && user.password === password) {
      return { success: true, userId: user.user_id };
    }
    return { success: false, error: 'Invalid email or password' };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('sign-up', async (event, { email, password }) => {
  try {
    const userId = 'u-' + Math.random().toString(36).substring(2, 9);
    db.prepare('INSERT OR IGNORE INTO local_users (email, password, user_id) VALUES (?, ?, ?)')
      .run(email, password, userId);
    return { success: true, userId };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

async function downloadRemoteAssets() {
  console.log('Starting background remote assets download check...');
  
  async function downloadFile(url, destPath) {
    try {
      const res = await net.fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const buffer = await res.arrayBuffer();
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, Buffer.from(buffer));
      return true;
    } catch (err) {
      console.error(`Failed to download ${url}:`, err.message);
      return false;
    }
  }

  function parseUrl(urlStr) {
    if (!urlStr) return null;

    // Handle local-media:// refs — check if the file exists locally;
    // if it does, no download needed; if not, skip (nothing to download from).
    if (urlStr.startsWith('local-media://')) {
      const relPath = urlStr.slice('local-media://'.length);
      const localPath = path.join(LOCAL_MEDIA_DIR, relPath);
      if (fs.existsSync(localPath)) return null; // already have it
      // Also check the bundled path
      const bundledPath = path.join(UNPACKED_PATH, 'local_media', relPath);
      if (fs.existsSync(bundledPath)) return null; // available from bundle
      // File is truly missing — nothing we can do without a remote URL
      return null;
    }

    let cleanUrl = urlStr;
    if (urlStr.includes('::')) {
      const parts = urlStr.split('::');
      cleanUrl = parts[parts.length - 1];
    }

    if (!cleanUrl.startsWith('http')) return null;

    const supabaseMatch = cleanUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (supabaseMatch) {
      return {
        bucket: supabaseMatch[1],
        filePath: supabaseMatch[2],
        cleanUrl
      };
    }
    try {
      const parsed = new URL(cleanUrl);
      const ext = path.extname(parsed.pathname) || '.jpg';
      let hash = 0;
      for (let i = 0; i < cleanUrl.length; i++) {
        hash = (hash << 5) - hash + cleanUrl.charCodeAt(i);
        hash |= 0;
      }
      const safeName = `external_${Math.abs(hash)}${ext}`;
      return {
        bucket: 'external-media',
        filePath: safeName,
        cleanUrl
      };
    } catch {
      return null;
    }
  }

  async function processUrl(url) {
    const parsed = parseUrl(url);
    if (!parsed) return url;

    const localUrl = `local-media://${parsed.bucket}/${parsed.filePath}`;
    const destPath = path.join(LOCAL_MEDIA_DIR, parsed.bucket, parsed.filePath);

    if (fs.existsSync(destPath)) {
      return localUrl;
    }

    console.log(`Downloading remote asset: ${parsed.cleanUrl} -> ${destPath}`);
    const ok = await downloadFile(parsed.cleanUrl, destPath);
    return ok ? localUrl : url;
  }

  // 1. commandants
  const commandants = db.prepare('SELECT id, name, image_url FROM commandants').all();
  for (const cmd of commandants) {
    if (cmd.image_url) {
      const updatedUrl = await processUrl(cmd.image_url);
      if (updatedUrl !== cmd.image_url) {
        db.prepare('UPDATE commandants SET image_url = ? WHERE id = ?').run(updatedUrl, cmd.id);
        console.log(`Downloaded and updated commandant image: ${cmd.name}`);
      }
    }
  }

  // 2. personnel
  const personnel = db.prepare('SELECT id, name, image_url FROM personnel').all();
  for (const p of personnel) {
    if (p.image_url) {
      const updatedUrl = await processUrl(p.image_url);
      if (updatedUrl !== p.image_url) {
        db.prepare('UPDATE personnel SET image_url = ? WHERE id = ?').run(updatedUrl, p.id);
        console.log(`Downloaded and updated personnel image: ${p.name}`);
      }
    }
  }

  // 3. visits
  const visits = db.prepare('SELECT id, name, image_url FROM visits').all();
  for (const v of visits) {
    if (v.image_url) {
      const updatedUrl = await processUrl(v.image_url);
      if (updatedUrl !== v.image_url) {
        db.prepare('UPDATE visits SET image_url = ? WHERE id = ?').run(updatedUrl, v.id);
        console.log(`Downloaded and updated visit image: ${v.name}`);
      }
    }
  }

  // 4. museum_tours
  const tours = db.prepare('SELECT id, name, cover_image_url FROM museum_tours').all();
  for (const t of tours) {
    if (t.cover_image_url) {
      const updatedUrl = await processUrl(t.cover_image_url);
      if (updatedUrl !== t.cover_image_url) {
        db.prepare('UPDATE museum_tours SET cover_image_url = ? WHERE id = ?').run(updatedUrl, t.id);
        console.log(`Downloaded and updated tour cover: ${t.name}`);
      }
    }
  }

  // 5. museum_artifacts
  const artifacts = db.prepare('SELECT id, name, media_urls FROM museum_artifacts').all();
  for (const a of artifacts) {
    if (a.media_urls) {
      try {
        const urls = JSON.parse(a.media_urls);
        if (Array.isArray(urls)) {
          const updatedUrls = [];
          let changed = false;
          for (const u of urls) {
            const updated = await processUrl(u);
            if (updated !== u) {
              changed = true;
            }
            updatedUrls.push(updated);
          }
          if (changed) {
            db.prepare('UPDATE museum_artifacts SET media_urls = ? WHERE id = ?')
              .run(JSON.stringify(updatedUrls), a.id);
            console.log(`Downloaded and updated artifact media: ${a.name}`);
          }
        }
      } catch (e) {
        console.error(`Failed to parse media_urls for artifact ${a.name}:`, e.message);
      }
    }
  }

  // 6. museum_tour_steps
  const steps = db.prepare('SELECT id, title, audio_url FROM museum_tour_steps').all();
  for (const s of steps) {
    if (s.audio_url) {
      const updatedUrl = await processUrl(s.audio_url);
      if (updatedUrl !== s.audio_url) {
        db.prepare('UPDATE museum_tour_steps SET audio_url = ? WHERE id = ?').run(updatedUrl, s.id);
        console.log(`Downloaded and updated tour step audio: ${s.title}`);
      }
    }
  }

  // 7. audio_tracks
  const tracks = db.prepare('SELECT id, name, bucket_path FROM audio_tracks').all();
  for (const tr of tracks) {
    if (tr.bucket_path) {
      let url = tr.bucket_path;
      if (!url.startsWith('http')) {
        url = `https://iemdygtyyouosqmbwadn.supabase.co/storage/v1/object/public/ndc-audio/${tr.bucket_path}`;
      }
      const parsed = parseUrl(url);
      if (parsed) {
        const destPath = path.join(LOCAL_MEDIA_DIR, 'ndc-audio', parsed.filePath);
        if (!fs.existsSync(destPath)) {
          console.log(`Downloading audio track: ${url} -> ${destPath}`);
          await downloadFile(url, destPath);
        }
      }
    }
  }

  console.log('Background remote assets migration check complete.');
}
