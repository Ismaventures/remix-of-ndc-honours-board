/**
 * Dropbox Sync Module for NDC Honours Board
 * 
 * Mirrors local_media/ and database.sqlite to a Dropbox folder
 * for cross-device sync and cloud backup.
 * 
 * Uses OAuth2 desktop-app flow: opens browser for Dropbox sign-in,
 * stores refresh token in userData/dropbox-token.json for persistence.
 */

const { app, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

const TOKEN_FILENAME = 'dropbox-token.json';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const LOG_FILE = isDev ? null : path.join(app.getPath('userData'), 'crash.log');
const DEBUG_LOG_FILE = path.join(app.getPath('userData'), 'sync-debug.log');

function logToFile(msg) {
  const line = `[${new Date().toISOString()}] [DropboxSync] ${msg}\n`;
  console.log(`[DropboxSync] ${msg}`);
  if (LOG_FILE) {
    try {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      fs.appendFileSync(LOG_FILE, line);
    } catch (_) {}
  }
  try {
    fs.mkdirSync(path.dirname(DEBUG_LOG_FILE), { recursive: true });
    fs.appendFileSync(DEBUG_LOG_FILE, line);
  } catch (_) {}
}

function computeDropboxHash(filePath) {
  const BLOCK_SIZE = 4 * 1024 * 1024; // 4MB
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(BLOCK_SIZE);
  const blockHashes = [];
  
  let bytesRead = 0;
  while (true) {
    bytesRead = fs.readSync(fd, buffer, 0, BLOCK_SIZE, null);
    if (bytesRead === 0) break;
    
    const block = bytesRead === BLOCK_SIZE ? buffer : buffer.subarray(0, bytesRead);
    const hash = crypto.createHash('sha256').update(block).digest();
    blockHashes.push(hash);
  }
  fs.closeSync(fd);
  
  if (blockHashes.length === 0) {
    return crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  }
  
  const combined = Buffer.concat(blockHashes);
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// ── Helpers ─────────────────────────────────────────────────────────

function getCredentialsPath() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, 'dropbox-credentials.json');
  }
  return path.join(process.resourcesPath, 'dropbox-credentials.json');
}

function getTokenPath() {
  return path.join(app.getPath('userData'), TOKEN_FILENAME);
}

function loadCredentials() {
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(
      'Dropbox credentials not found. Please place dropbox-credentials.json ' +
      'in the electron/ folder (dev) or app resources (production).'
    );
  }
  const content = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  return {
    appKey: content.app_key,
    appSecret: content.app_secret
  };
}

function loadToken() {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    // Check if pre-seeded token is in extraResources (production)
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (!isDev) {
      const bundledTokenPath = path.join(process.resourcesPath, TOKEN_FILENAME);
      logToFile('Token not found in userData. Checking bundled token path: ' + bundledTokenPath);
      if (fs.existsSync(bundledTokenPath)) {
        try {
          const bundledToken = fs.readFileSync(bundledTokenPath, 'utf8');
          fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
          fs.writeFileSync(tokenPath, bundledToken);
          logToFile('Successfully copied bundled dropbox-token.json to: ' + tokenPath);
        } catch (err) {
          logToFile('Failed to copy bundled token: ' + err.message);
        }
      }
    }
  }

  if (!fs.existsSync(tokenPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch (err) {
    logToFile('Failed to parse dropbox-token.json: ' + err.message);
    return null;
  }
}

function saveToken(token) {
  fs.writeFileSync(getTokenPath(), JSON.stringify(token, null, 2));

  // In dev mode, also mirror to the local codebase folder so it's bundled automatically
  if (isDev) {
    try {
      const devTokenPath = path.join(__dirname, TOKEN_FILENAME);
      fs.writeFileSync(devTokenPath, JSON.stringify(token, null, 2));
      logToFile('Dev mode: Syncing saved token to codebase path: ' + devTokenPath);
    } catch (err) {
      console.error('[DropboxSync] Failed to mirror token to codebase:', err.message);
    }
  }
}

function clearToken() {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }

  // In dev mode, also clear it from the local codebase folder
  if (isDev) {
    try {
      const devTokenPath = path.join(__dirname, TOKEN_FILENAME);
      if (fs.existsSync(devTokenPath)) {
        fs.unlinkSync(devTokenPath);
      }
    } catch (err) {
      console.error('[DropboxSync] Failed to clear token from codebase:', err.message);
    }
  }
}

// ── OAuth2 Token Handling ───────────────────────────────────────────

async function getAccessToken() {
  const token = loadToken();
  if (!token) return null;

  // Refresh token if it's within 5 minutes of expiring, or already expired
  const isExpired = !token.expiry_time || Date.now() >= token.expiry_time - 300000;
  if (isExpired) {
    logToFile('Access token expired. Refreshing token...');
    try {
      const { appKey, appSecret } = loadCredentials();
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', token.refresh_token);
      params.append('client_id', appKey);
      params.append('client_secret', appSecret);

      const resp = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Token refresh failed: ${resp.statusText} (${errorText})`);
      }

      const newTokens = await resp.json();
      token.access_token = newTokens.access_token;
      token.expiry_time = Date.now() + (newTokens.expires_in * 1000);
      if (newTokens.refresh_token) {
        token.refresh_token = newTokens.refresh_token;
      }
      saveToken(token);
      logToFile('Access token refreshed successfully.');
    } catch (err) {
      logToFile('Failed to refresh access token: ' + err.stack);
      console.error('[DropboxSync] Refresh failed:', err);
      return null;
    }
  }

  return token.access_token;
}

// ── Authentication Checks ───────────────────────────────────────────

async function getAuthStatus() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      logToFile('getAuthStatus: No valid access token.');
      return { authenticated: false };
    }

    const resp = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: 'null'
    });

    if (!resp.ok) {
      logToFile(`getAuthStatus API failed: ${resp.statusText}`);
      return { authenticated: false };
    }

    const user = await resp.json();
    return {
      authenticated: true,
      email: user.email,
      name: user.name.display_name,
      picture: user.profile_photo_url || null
    };
  } catch (err) {
    logToFile('getAuthStatus failed: ' + err.stack);
    console.error('[DropboxSync] Auth status check failed:', err.message);
    return { authenticated: false };
  }
}

async function authorize() {
  const REDIRECT_PORT = 3456;
  const redirectUri = `http://localhost:${REDIRECT_PORT}`;
  const { appKey, appSecret } = loadCredentials();

  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.pathname !== '/') return;

        const code = parsedUrl.query.code;
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>No code received.</p>');
          reject(new Error('No authorization code received'));
          server.close();
          return;
        }

        // Exchange code for token
        const params = new URLSearchParams();
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('client_id', appKey);
        params.append('client_secret', appSecret);
        params.append('redirect_uri', redirectUri);

        const tokenResp = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        if (!tokenResp.ok) {
          const errText = await tokenResp.text();
          throw new Error(`Token exchange failed: ${tokenResp.statusText} (${errText})`);
        }

        const tokens = await tokenResp.json();
        tokens.expiry_time = Date.now() + (tokens.expires_in * 1000);
        saveToken(tokens);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
          <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4f8;">
            <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
              <h1 style="color:#002060;">✓ Connected to Dropbox</h1>
              <p style="color:#666;">You can close this window and return to the app.</p>
            </div>
          </body>
          </html>
        `);

        server.close();

        // Fetch user profile
        const userResp = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          },
          body: 'null'
        });
        const user = await userResp.json();

        resolve({
          authenticated: true,
          email: user.email,
          name: user.name.display_name,
          picture: user.profile_photo_url || null
        });
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Authorization failed</h1><p>' + err.message + '</p>');
        }
        reject(err);
        server.close();
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`[DropboxSync] OAuth server listening on port ${REDIRECT_PORT}`);
      shell.openExternal(authUrl);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

function signOut() {
  clearToken();
  return { authenticated: false };
}

// ── Dropbox Client File Operations ──────────────────────────────────

/**
 * Upload a file to Dropbox. Autocreates parent directories.
 */
async function uploadFile(accessToken, localPath, dropboxPath, clientModifiedDate) {
  const content = fs.readFileSync(localPath);
  const apiArgs = {
    path: dropboxPath,
    mode: 'overwrite',
    autorename: false,
    mute: true
  };
  if (clientModifiedDate) {
    apiArgs.client_modified = clientModifiedDate.toISOString().split('.')[0] + 'Z';
  }

  const resp = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify(apiArgs),
      'Content-Type': 'application/octet-stream'
    },
    body: content
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to upload ${dropboxPath}: ${resp.statusText} (${errorText})`);
  }

  return await resp.json();
}

/**
 * Download a file from Dropbox.
 */
async function downloadFile(accessToken, dropboxPath, destLocalPath) {
  fs.mkdirSync(path.dirname(destLocalPath), { recursive: true });

  const resp = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath })
    }
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to download ${dropboxPath}: ${resp.statusText} (${errorText})`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  fs.writeFileSync(destLocalPath, Buffer.from(arrayBuffer));
}

/**
 * Delete a file or folder from Dropbox.
 */
async function deleteDropboxFile(accessToken, dropboxPath) {
  const resp = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path: dropboxPath })
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to delete ${dropboxPath}: ${resp.statusText} (${errorText})`);
  }

  return await resp.json();
}

/**
 * Recursively list all files in a Dropbox directory.
 */
async function listFolder(accessToken, folderPath = "") {
  let allEntries = [];
  let hasMore = true;
  let cursor = null;

  try {
    let endpoint = 'https://api.dropboxapi.com/2/files/list_folder';
    let body = JSON.stringify({ path: folderPath, recursive: true });

    while (hasMore) {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`list_folder failed: ${resp.statusText} (${errorText})`);
      }

      const data = await resp.json();
      allEntries.push(...data.entries);
      hasMore = data.has_more;
      cursor = data.cursor;

      endpoint = 'https://api.dropboxapi.com/2/files/list_folder/continue';
      body = JSON.stringify({ cursor });
    }
  } catch (err) {
    logToFile('listFolder error: ' + err.message);
    throw err;
  }

  return allEntries;
}

// ── Directory Transversals ──────────────────────────────────────────

function countLocalFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      count += countLocalFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

async function uploadDirectoryRecursive(accessToken, localDir, progressCallback, totalFiles, currentProgress, basePath = '/local_media', remoteFilesMap = new Map()) {
  if (!fs.existsSync(localDir)) return { uploaded: 0, skipped: 0, errors: 0 };
  let stats = { uploaded: 0, skipped: 0, errors: 0 };
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
    const localPath = path.join(localDir, entry.name);
    const dropboxPath = `${basePath}/${entry.name}`;

    if (entry.isDirectory()) {
      const subStats = await uploadDirectoryRecursive(accessToken, localPath, progressCallback, totalFiles, currentProgress, dropboxPath, remoteFilesMap);
      stats.uploaded += subStats.uploaded;
      stats.skipped += subStats.skipped;
      stats.errors += subStats.errors;
    } else {
      currentProgress.value++;
      const localStat = fs.statSync(localPath);
      const remoteFile = remoteFilesMap.get(dropboxPath.toLowerCase());
      
      let shouldUpload = !remoteFile;
      let reason = 'not found on Dropbox';
      if (remoteFile) {
        if (localStat.size !== remoteFile.size) {
          shouldUpload = true;
          reason = `size is different (local: ${localStat.size}, remote: ${remoteFile.size})`;
        } else {
          try {
            const localHash = computeDropboxHash(localPath);
            if (localHash !== remoteFile.content_hash) {
              shouldUpload = true;
              reason = `content hash is different (local: ${localHash}, remote: ${remoteFile.content_hash})`;
            } else {
              shouldUpload = false;
              reason = `identical size and content hash (local/remote size: ${localStat.size})`;
            }
          } catch (hashErr) {
            logToFile(`Hash calculation failed for ${dropboxPath}: ${hashErr.message}. Falling back to mtime.`);
            const remoteTime = new Date(remoteFile.client_modified || remoteFile.server_modified);
            const timeDiff = Math.floor(localStat.mtime.getTime() / 1000) - Math.floor(remoteTime.getTime() / 1000);
            shouldUpload = timeDiff > 0;
            reason = `hash failed; localMtime: ${localStat.mtime.toISOString()}, remoteTime: ${remoteTime.toISOString()}, timeDiffSec: ${timeDiff}`;
          }
        }
      }
      logToFile(`File [${dropboxPath}]: shouldUpload=${shouldUpload} (Reason: ${reason})`);

      if (shouldUpload) {
        if (progressCallback) {
          progressCallback({
            phase: 'uploading',
            file: dropboxPath,
            current: currentProgress.value,
            total: totalFiles
          });
        }
        try {
          await uploadFile(accessToken, localPath, dropboxPath, localStat.mtime);
          stats.uploaded++;
        } catch (err) {
          logToFile(`Failed to upload ${dropboxPath}: ` + err.message);
          stats.errors++;
        }
      } else {
        stats.skipped++;
        if (progressCallback) {
          progressCallback({
            phase: 'uploading',
            file: `${dropboxPath} (skipped)`,
            current: currentProgress.value,
            total: totalFiles
          });
        }
      }
    }
  }

  return stats;
}

// ── Exported Sync APIs ──────────────────────────────────────────────

function getLocalFilesRecursive(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getLocalFilesRecursive(fullPath, baseDir));
    } else {
      results.push({
        fullPath,
        relativePath: path.relative(baseDir, fullPath)
      });
    }
  }
  return results;
}

/**
 * Read a version from database-metadata.json.
 * Supports both the old `cmsLastModified` (timestamp) and new `schemaVersion` (monotonic integer).
 * Returns the higher of the two if both are present, for backward compatibility.
 */
function readMetadataVersion(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const ts = meta.cmsLastModified || 0;
    const sv = meta.schemaVersion || 0;
    return Math.max(ts, sv);
  } catch (err) {
    logToFile(`[TwoWaySync] Failed to read metadata: ${err.message}`);
    return 0;
  }
}

function writeMetadataVersion(filePath, version) {
  const data = {
    cmsLastModified: version,
    schemaVersion: version,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function syncTwoWay(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload, direction = 'auto') {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Dropbox');

  logToFile('[TwoWaySync] Starting sync...');

  // Get remote file catalog
  let remoteFiles = [];
  try {
    remoteFiles = await listFolder(accessToken, "");
  } catch (err) {
    if (err.message.includes('path/not_found')) {
      logToFile('[TwoWaySync] No files found on Dropbox.');
    } else {
      throw err;
    }
  }
  const remoteFilesMap = new Map(remoteFiles.map(f => [f.path_lower, f]));
  logToFile(`[TwoWaySync] Fetched ${remoteFiles.length} remote files.`);

  let uploaded = 0;
  let downloaded = 0;
  let skipped = 0;
  let deleted = 0;
  let errors = 0;
  let dbDownloaded = 0;

  // --- 1. Load logical CMS metadata versions ---
  const metadataPath = path.join(path.dirname(dbPath), 'database-metadata.json');
  const localVersion = readMetadataVersion(metadataPath);

  let remoteVersion = 0;
  const remoteMetaFile = remoteFilesMap.get('/database-metadata.json');
  if (remoteMetaFile) {
    const tempMetaPath = path.join(app.getPath('temp'), 'remote-metadata.json');
    try {
      await downloadFile(accessToken, '/database-metadata.json', tempMetaPath);
      remoteVersion = readMetadataVersion(tempMetaPath);
      fs.unlinkSync(tempMetaPath);
    } catch (err) {
      logToFile(`[TwoWaySync] Failed to read remote metadata: ${err.message}`);
    }
  }

  logToFile(`[TwoWaySync] DB versions: Local: ${localVersion}, Remote: ${remoteVersion}`);

  // --- 2. Database Sync ---
  if (fs.existsSync(dbPath)) {
    const localStat = fs.statSync(dbPath);
    const remoteDbFile = remoteFilesMap.get('/database.sqlite');

    if (direction === 'upload') {
      logToFile(`[TwoWaySync] [Upload mode] Pushing local database to Dropbox...`);
      try {
        await uploadFile(accessToken, dbPath, '/database.sqlite', localStat.mtime);
        const uploadVersion = localVersion || 1;
        writeMetadataVersion(metadataPath, uploadVersion);
        await uploadFile(accessToken, metadataPath, '/database-metadata.json', fs.statSync(metadataPath).mtime);
        uploaded++;
      } catch (err) {
        logToFile(`[TwoWaySync] Failed to upload database: ${err.message}`);
        errors++;
      }
    } else if (direction === 'download') {
      if (!remoteDbFile) {
        logToFile('[TwoWaySync] [Download mode] No remote database found. Skipping.');
        skipped++;
      } else {
        logToFile(`[TwoWaySync] [Download mode] Pulling remote database from Dropbox...`);
        if (onBeforeDbDownload) onBeforeDbDownload();
        try {
          await downloadFile(accessToken, '/database.sqlite', dbPath);

          let metaDataDownloaded = false;
          if (remoteMetaFile) {
            try {
              await downloadFile(accessToken, '/database-metadata.json', metadataPath);
              metaDataDownloaded = true;
            } catch (err) {
              logToFile(`[TwoWaySync] Failed to download remote metadata: ${err.message}`);
            }
          }

          if (!metaDataDownloaded) {
            writeMetadataVersion(metadataPath, remoteVersion || 1);
          }

          const remoteFileTime = new Date(remoteDbFile.client_modified || remoteDbFile.server_modified).getTime();
          const remoteDate = new Date(remoteFileTime);
          fs.utimesSync(dbPath, remoteDate, remoteDate);

          downloaded++;
          dbDownloaded = 1;
        } catch (err) {
          logToFile(`[TwoWaySync] Failed to download database: ${err.message}`);
          errors++;
        } finally {
          if (onAfterDbDownload) onAfterDbDownload();
        }
      }
    } else {
      // Auto mode — version-based comparison
      if (!remoteDbFile) {
        logToFile('[TwoWaySync] Database not found on Dropbox. Uploading local database...');
        try {
          await uploadFile(accessToken, dbPath, '/database.sqlite', localStat.mtime);
          const initVersion = localVersion || 1;
          writeMetadataVersion(metadataPath, initVersion);
          await uploadFile(accessToken, metadataPath, '/database-metadata.json', fs.statSync(metadataPath).mtime);
          uploaded++;
        } catch (err) {
          logToFile(`[TwoWaySync] Failed to upload database: ${err.message}`);
          errors++;
        }
      } else {
        let dbShouldUpload = false;
        let dbShouldDownload = false;
        const localFileTime = localStat.mtime.getTime();
        const remoteFileTime = new Date(remoteDbFile.client_modified || remoteDbFile.server_modified).getTime();

        if (localVersion === 0 && remoteVersion === 0) {
          logToFile('[TwoWaySync] Both CMS versions are 0. Falling back to physical file modification time...');
          if (localFileTime - remoteFileTime > 2000) {
            dbShouldUpload = true;
          } else if (remoteFileTime - localFileTime > 2000) {
            dbShouldDownload = true;
          } else {
            logToFile('[TwoWaySync] Files are physically in sync. Bootstrapping version to 1...');
            writeMetadataVersion(metadataPath, 1);
            try {
              await uploadFile(accessToken, metadataPath, '/database-metadata.json', fs.statSync(metadataPath).mtime);
            } catch (err) {
              logToFile(`[TwoWaySync] Failed to bootstrap remote metadata: ${err.message}`);
            }
          }
        } else {
          if (localVersion > remoteVersion) {
            dbShouldUpload = true;
          } else if (remoteVersion > localVersion) {
            dbShouldDownload = true;
          }
        }

        if (dbShouldUpload) {
          logToFile(`[TwoWaySync] Local database is newer (Local: ${localVersion}, Remote: ${remoteVersion}). Uploading...`);
          try {
            const remoteMeta = await uploadFile(accessToken, dbPath, '/database.sqlite', localStat.mtime);
            if (remoteMeta && remoteMeta.client_modified) {
              const actualRemoteTime = new Date(remoteMeta.client_modified);
              fs.utimesSync(dbPath, actualRemoteTime, actualRemoteTime);
            }
            const uploadVersion = localVersion || 1;
            writeMetadataVersion(metadataPath, uploadVersion);
            await uploadFile(accessToken, metadataPath, '/database-metadata.json', fs.statSync(metadataPath).mtime);
            uploaded++;
          } catch (err) {
            logToFile(`[TwoWaySync] Failed to upload database: ${err.message}`);
            errors++;
          }
        } else if (dbShouldDownload) {
          logToFile(`[TwoWaySync] Dropbox database is newer (Remote: ${remoteVersion}, Local: ${localVersion}). Downloading...`);
          if (onBeforeDbDownload) onBeforeDbDownload();
          try {
            await downloadFile(accessToken, '/database.sqlite', dbPath);
            let metaDataDownloaded = false;
            if (remoteMetaFile) {
              try {
                await downloadFile(accessToken, '/database-metadata.json', metadataPath);
                metaDataDownloaded = true;
              } catch (err) {
                logToFile(`[TwoWaySync] Failed to download remote metadata: ${err.message}`);
              }
            }
            if (!metaDataDownloaded) {
              writeMetadataVersion(metadataPath, remoteVersion || 1);
            }
            const remoteDate = new Date(remoteFileTime);
            fs.utimesSync(dbPath, remoteDate, remoteDate);
            downloaded++;
            dbDownloaded = 1;
          } catch (err) {
            logToFile(`[TwoWaySync] Failed to download database: ${err.message}`);
            errors++;
          } finally {
            if (onAfterDbDownload) onAfterDbDownload();
          }
        } else {
          logToFile('[TwoWaySync] Database is already in sync.');
          skipped++;
        }
      }
    }
  }

  // --- 3. Media Files Sync ---
  // Media changes always accompany DB changes, so we use the sync direction
  // rather than file mtimes (which cause false "newer" detections).
  const localFiles = getLocalFilesRecursive(localMediaDir);
  const totalFiles = localFiles.length + 1;
  let currentProgress = 0;

  const shouldUploadMedia = direction === 'upload' || (direction === 'auto' && localVersion > remoteVersion);
  const shouldDownloadMedia = direction === 'download' || (direction === 'auto' && remoteVersion > localVersion);

  if (shouldUploadMedia) {
    logToFile(`[TwoWaySync] Uploading local media unmatched on Dropbox...`);
    for (const localFile of localFiles) {
      currentProgress++;
      const dropboxPath = `/local_media/${localFile.relativePath.replace(/\\/g, '/')}`;
      const remoteFile = remoteFilesMap.get(dropboxPath.toLowerCase());
      const localStat = fs.statSync(localFile.fullPath);

      if (!remoteFile || localStat.size !== remoteFile.size) {
        if (progressCallback) {
          progressCallback({ phase: 'uploading', file: dropboxPath, current: currentProgress, total: totalFiles });
        }
        try {
          const remoteMeta = await uploadFile(accessToken, localFile.fullPath, dropboxPath, localStat.mtime);
          if (remoteMeta && remoteMeta.client_modified) {
            const actualRemoteTime = new Date(remoteMeta.client_modified);
            fs.utimesSync(localFile.fullPath, actualRemoteTime, actualRemoteTime);
          }
          uploaded++;
        } catch (err) {
          logToFile(`[TwoWaySync] Failed to upload ${dropboxPath}: ${err.message}`);
          errors++;
        }
      } else {
        skipped++;
      }
    }
  } else if (shouldDownloadMedia) {
    logToFile(`[TwoWaySync] Downloading remote media not found locally...`);
    for (const localFile of localFiles) {
      currentProgress++;
      const dropboxPath = `/local_media/${localFile.relativePath.replace(/\\/g, '/')}`;
      const remoteFile = remoteFilesMap.get(dropboxPath.toLowerCase());
      const localStat = fs.statSync(localFile.fullPath);

      if (remoteFile && localStat.size !== remoteFile.size) {
        if (progressCallback) {
          progressCallback({ phase: 'downloading', file: dropboxPath, current: currentProgress, total: totalFiles });
        }
        try {
          await downloadFile(accessToken, remoteFile.path_display, localFile.fullPath);
          const remoteDate = new Date(remoteFile.client_modified || remoteFile.server_modified);
          fs.utimesSync(localFile.fullPath, remoteDate, remoteDate);
          downloaded++;
        } catch (err) {
          logToFile(`[TwoWaySync] Failed to download ${dropboxPath}: ${err.message}`);
          errors++;
        }
      } else {
        skipped++;
      }
    }
  } else if (direction === 'auto') {
    logToFile(`[TwoWaySync] DB versions match (${localVersion}). Skipping media sync (no content changes expected).`);
    skipped += localFiles.length;
  }

  // Check remote files not present locally
  logToFile('[TwoWaySync] Scanning remote files not present locally...');
  for (const remoteFile of remoteFiles) {
    if (remoteFile.path_display.startsWith('/local_media/') && remoteFile['.tag'] === 'file') {
      const relativePath = remoteFile.path_display.slice('/local_media/'.length);
      const destLocalPath = path.join(localMediaDir, relativePath);

      if (!fs.existsSync(destLocalPath)) {
        const shouldDownloadMissing = direction === 'download' || (direction === 'auto' && remoteVersion > localVersion);

        if (shouldDownloadMissing) {
          logToFile(`[TwoWaySync] Remote file [${remoteFile.path_display}] was added remotely. Downloading...`);
          if (progressCallback) {
            progressCallback({ phase: 'downloading', file: remoteFile.path_display, current: currentProgress, total: totalFiles });
          }
          try {
            await downloadFile(accessToken, remoteFile.path_display, destLocalPath);
            const remoteTime = new Date(remoteFile.client_modified || remoteFile.server_modified);
            fs.utimesSync(destLocalPath, remoteTime, remoteTime);
            downloaded++;
          } catch (err) {
            logToFile(`[TwoWaySync] Failed to download remote file ${remoteFile.path_display}: ${err.message}`);
            errors++;
          }
        } else {
          logToFile(`[TwoWaySync] Remote file [${remoteFile.path_display}] was deleted locally. Deleting from Dropbox...`);
          try {
            await deleteDropboxFile(accessToken, remoteFile.path_display);
            deleted++;
          } catch (err) {
            logToFile(`[TwoWaySync] Failed to delete remote file ${remoteFile.path_display}: ${err.message}`);
            errors++;
          }
        }
      }
    }
  }

  // Save push sync statistics
  const syncInfo = {
    lastPushTime: new Date().toISOString(),
    filesUploaded: uploaded,
    filesDownloaded: downloaded,
    filesSkipped: skipped,
    filesDeleted: deleted,
    errors
  };
  try {
    const syncInfoPath = path.join(app.getPath('userData'), 'drive-sync-info.json');
    let existing = {};
    if (fs.existsSync(syncInfoPath)) {
      try { existing = JSON.parse(fs.readFileSync(syncInfoPath, 'utf8')); } catch {}
    }
    fs.writeFileSync(syncInfoPath, JSON.stringify({ ...existing, ...syncInfo }, null, 2));
  } catch {}

  logToFile(`[TwoWaySync] Sync complete. Uploaded: ${uploaded}, Downloaded: ${downloaded}, Skipped: ${skipped}, Deleted: ${deleted}, Errors: ${errors}`);

  return {
    success: errors === 0,
    uploaded,
    downloaded,
    skipped,
    deleted,
    errors,
    dbDownloaded: dbDownloaded === 1
  };
}

async function pushToCloud(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload) {
  return await syncTwoWay(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload, 'upload');
}

async function pullFromCloud(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload) {
  return await syncTwoWay(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload, 'download');
}

async function syncAuto(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload) {
  return await syncTwoWay(localMediaDir, dbPath, progressCallback, onBeforeDbDownload, onAfterDbDownload, 'auto');
}

async function pushSingleFile(localPath, relativePath) {
  const accessToken = await getAccessToken();
  if (!accessToken) return; // Silently skip if not authenticated

  const dropboxPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  try {
    let clientModifiedDate = null;
    if (fs.existsSync(localPath)) {
      clientModifiedDate = fs.statSync(localPath).mtime;
    }
    await uploadFile(accessToken, localPath, dropboxPath, clientModifiedDate);
    logToFile(`Auto-pushed single file successfully: ${dropboxPath}`);
  } catch (err) {
    logToFile(`Failed to auto-push single file ${dropboxPath}: ` + err.message);
  }
}

function getSyncStatus() {
  const syncInfoPath = path.join(app.getPath('userData'), 'drive-sync-info.json');
  if (!fs.existsSync(syncInfoPath)) {
    return { lastPushTime: null, lastPullTime: null };
  }
  try {
    return JSON.parse(fs.readFileSync(syncInfoPath, 'utf8'));
  } catch {
    return { lastPushTime: null, lastPullTime: null };
  }
}

module.exports = {
  authorize,
  signOut,
  getAuthStatus,
  pushToCloud,
  pullFromCloud,
  syncAuto,
  pushSingleFile,
  getSyncStatus
};
