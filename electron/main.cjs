const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_PATH = app.getAppPath();

// In development, keep writeable files in the workspace root.
// In production, write them to standard user application support directory.
const LOCAL_MEDIA_DIR = isDev 
  ? path.join(process.cwd(), 'local_media') 
  : path.join(app.getPath('userData'), 'local_media');

const DB_PATH = isDev 
  ? path.join(process.cwd(), 'database.sqlite') 
  : path.join(app.getPath('userData'), 'database.sqlite');

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
        stmt = stmt.split('\n').map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
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
        stmt = stmt.split('\n').map(line => line.replace(/--.*$/, '').trim()).join(' ').trim();
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
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.cjs')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'preload.cjs');

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

  // Forward renderer console messages to main terminal output
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (from ${path.basename(sourceId)}:${line})`);
  });

  if (isDev) {
    win.loadURL('http://localhost:8080');
  } else {
    win.loadFile(path.join(APP_PATH, 'dist', 'index.html'));
  }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied missing asset: ${entry.name}`);
    }
  }
}

/**
 * Merge updated image_url references from the bundled (read-only) database
 * into the user's writable database. This ensures that when a new app version
 * ships with updated image paths, those updates are propagated even though
 * the user's database already exists and won't be overwritten.
 */
function mergeDatabaseUpdates(bundledDbPath, userDbPath) {
  if (!fs.existsSync(bundledDbPath) || !fs.existsSync(userDbPath)) return;
  try {
    const bundledDb = new Database(bundledDbPath, { readonly: true });
    const userDb = new Database(userDbPath);

    // Merge personnel image_url updates
    const bundledPersonnel = bundledDb.prepare(
      "SELECT id, image_url FROM personnel WHERE image_url IS NOT NULL AND image_url != ''"
    ).all();
    const updatePersonnel = userDb.prepare(
      "UPDATE personnel SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')"
    );
    userDb.transaction(() => {
      for (const row of bundledPersonnel) {
        updatePersonnel.run(row.image_url, row.id);
      }
    })();
    console.log(`Merged ${bundledPersonnel.length} personnel image references from bundled DB.`);

    // Merge commandant image_url updates
    const bundledCommandants = bundledDb.prepare(
      "SELECT id, image_url FROM commandants WHERE image_url IS NOT NULL AND image_url != ''"
    ).all();
    const updateCommandants = userDb.prepare(
      "UPDATE commandants SET image_url = ? WHERE id = ? AND (image_url IS NULL OR image_url = '')"
    );
    userDb.transaction(() => {
      for (const row of bundledCommandants) {
        updateCommandants.run(row.image_url, row.id);
      }
    })();
    console.log(`Merged ${bundledCommandants.length} commandant image references from bundled DB.`);

    bundledDb.close();
    userDb.close();
  } catch (err) {
    console.error('Failed to merge database updates:', err.message);
  }
}

app.whenReady().then(() => {
  // Set up local media directory
  if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
    fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
  }

  // Copy any missing bundled local_media assets to user data directory.
  // Uses copyMissingFiles so existing files are never overwritten but newly
  // bundled assets (e.g. new personnel images) are always picked up.
  if (!isDev) {
    const bundledMediaDir = path.join(APP_PATH, 'local_media');
    if (fs.existsSync(bundledMediaDir)) {
      try {
        copyMissingFiles(bundledMediaDir, LOCAL_MEDIA_DIR);
        console.log('Finished syncing bundled local_media to user data.');
      } catch (err) {
        console.error('Failed to sync bundled local_media:', err);
      }
    }
  }

  // If DB doesn't exist in userData (production), copy the bundled pre-populated database.
  // If it does exist, merge any updated image_url references from the bundled DB.
  if (!isDev) {
    const bundledDbPath = path.join(APP_PATH, 'database.sqlite');
    if (!fs.existsSync(DB_PATH)) {
      const dbDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      if (fs.existsSync(bundledDbPath)) {
        try {
          fs.copyFileSync(bundledDbPath, DB_PATH);
          console.log('Successfully copied bundled database.sqlite to user data.');
        } catch (err) {
          console.error('Failed to copy bundled database.sqlite:', err);
        }
      }
    } else if (fs.existsSync(bundledDbPath)) {
      // User DB already exists — merge any new image references from the bundled DB
      mergeDatabaseUpdates(bundledDbPath, DB_PATH);
    }
  }

  initializeDatabase();

  // Trigger background remote assets download and local migration
  setTimeout(() => {
    downloadRemoteAssets().catch(err => {
      console.error('Background assets download check failed:', err);
    });
  }, 1000);

  // Register modern protocol handle for local-media://
  // First check the writable userData directory, then fall back to the
  // read-only bundled assets inside APP_PATH. This ensures images render
  // even before copyMissingFiles finishes or if the copy was skipped.
  protocol.handle('local-media', (request) => {
    let filePath = request.url.slice('local-media://'.length);
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }
    const decodedPath = decodeURIComponent(filePath);
    const userPath = path.join(LOCAL_MEDIA_DIR, decodedPath);

    const getFileUrl = (p) => {
      try {
        return require('url').pathToFileURL(p).toString();
      } catch (e) {
        return process.platform === 'win32'
          ? 'file:///' + p.replace(/\\/g, '/')
          : 'file://' + p;
      }
    };

    // Try writable userData directory first
    if (fs.existsSync(userPath)) {
      return net.fetch(getFileUrl(userPath));
    }

    // Fallback to read-only bundled assets inside the app package
    if (!isDev) {
      const bundledPath = path.join(APP_PATH, 'local_media', decodedPath);
      if (fs.existsSync(bundledPath)) {
        return net.fetch(getFileUrl(bundledPath));
      }
    }

    // Default: still attempt userData path (will 404 naturally)
    return net.fetch(getFileUrl(userPath));
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

      // Check if this is an absolute /images/... or /placeholder.svg etc. request
      // that should be served from our dist/ directory
      const publicAssetMatch = filePath.match(/^\/(images\/.*|placeholder\.svg|favicon\.ico|robots\.txt)$/);
      if (publicAssetMatch) {
        const assetPath = path.join(APP_PATH, 'dist', publicAssetMatch[0]);
        callback({ path: assetPath });
        return;
      }

      // For all other file:// requests, pass through normally
      callback({ path: filePath });
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler for SQLite queries
ipcMain.handle('query-sqlite', async (event, queryDesc) => {
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
          const serializedRecord = serializeRowJsonColumns(table, record);
          const keys = Object.keys(serializedRecord);
          const placeholders = keys.map(() => '?').join(',');
          const values = Object.values(serializedRecord).map(normalizeSqliteValue);

          const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
          db.prepare(sql).run(...values);
          inserted.push(record);
        }
      })();

      return { data: Array.isArray(payload) ? inserted : inserted[0], error: null };
    }

    if (method === 'update') {
      const serializedPayload = serializeRowJsonColumns(table, payload);
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
          if (existing) {
            const serializedRecord = serializeRowJsonColumns(table, record);
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
            const serializedRecord = serializeRowJsonColumns(table, record);
            const keys = Object.keys(serializedRecord);
            const placeholders = keys.map(() => '?').join(',');
            const values = Object.values(serializedRecord).map(normalizeSqliteValue);

            const insertSql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
            db.prepare(insertSql).run(...values);
          }
          upserted.push(record);
        }
      })();

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
    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Failed to save media locally:', err);
    return { success: false, error: err.message || String(err) };
  }
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
      const bundledPath = path.join(APP_PATH, 'local_media', relPath);
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
