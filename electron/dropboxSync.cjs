/**
 * Dropbox Sync Module for NDC Honours Board
 * 
 * Mirrors local_media/ and database.sqlite to a Dropbox folder
 * for cross-device sync and cloud backup.
 * 
 * Uses OAuth2 desktop-app flow: opens browser for Dropbox sign-in,
 * stores refresh token in userData/dropbox-token.json for persistence.
 */

const { app, shell } = require('electron');
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

async function pushToCloud(localMediaDir, dbPath, progressCallback) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Dropbox');

  logToFile('Push to Dropbox started...');

  // Get remote file catalog
  let remoteFiles = [];
  try {
    remoteFiles = await listFolder(accessToken, "");
  } catch (err) {
    if (err.message.includes('path/not_found')) {
      logToFile('No files found on Dropbox.');
    } else {
      throw err;
    }
  }
  const remoteFilesMap = new Map(remoteFiles.map(f => [f.path_lower, f]));
  logToFile(`Fetched ${remoteFiles.length} remote files from Dropbox catalog.`);
  if (remoteFiles.length > 0) {
    logToFile(`Sample remote files: ${remoteFiles.slice(0, 5).map(f => `${f.path_lower} (${f.size} bytes)`).join(', ')}`);
  }

  const totalFiles = countLocalFiles(localMediaDir) + (fs.existsSync(dbPath) ? 1 : 0);
  const currentProgress = { value: 0 };

  // 1. Upload database if modified or size is different
  let dbUploaded = 0;
  let dbSkipped = 0;
  if (fs.existsSync(dbPath)) {
    const localStat = fs.statSync(dbPath);
    const remoteFile = remoteFilesMap.get('/database.sqlite');
    let shouldUpload = !remoteFile;
    let reason = 'not found on Dropbox';
    if (remoteFile) {
      if (localStat.size !== remoteFile.size) {
        shouldUpload = true;
        reason = `size is different (local: ${localStat.size}, remote: ${remoteFile.size})`;
      } else {
        try {
          const localHash = computeDropboxHash(dbPath);
          if (localHash !== remoteFile.content_hash) {
            shouldUpload = true;
            reason = `content hash is different (local: ${localHash}, remote: ${remoteFile.content_hash})`;
          } else {
            shouldUpload = false;
            reason = `identical size and content hash (local/remote size: ${localStat.size})`;
          }
        } catch (hashErr) {
          logToFile(`Hash calculation failed for database.sqlite: ${hashErr.message}. Falling back to mtime.`);
          const remoteTime = new Date(remoteFile.client_modified || remoteFile.server_modified);
          const timeDiff = Math.floor(localStat.mtime.getTime() / 1000) - Math.floor(remoteTime.getTime() / 1000);
          shouldUpload = timeDiff > 0;
          reason = `hash failed; localMtime: ${localStat.mtime.toISOString()}, remoteTime: ${remoteTime.toISOString()}, timeDiffSec: ${timeDiff}`;
        }
      }
    }
    logToFile(`Database [/database.sqlite]: shouldUpload=${shouldUpload} (Reason: ${reason})`);

    currentProgress.value++;
    if (shouldUpload) {
      try {
        if (progressCallback) {
          progressCallback({
            phase: 'uploading',
            file: '/database.sqlite',
            current: currentProgress.value,
            total: totalFiles
          });
        }
        await uploadFile(accessToken, dbPath, '/database.sqlite', localStat.mtime);
        dbUploaded = 1;
      } catch (err) {
        logToFile('Failed to upload database.sqlite: ' + err.message);
        throw new Error(`Database backup failed: ${err.message}`);
      }
    } else {
      dbSkipped = 1;
      if (progressCallback) {
        progressCallback({
          phase: 'uploading',
          file: '/database.sqlite (skipped)',
          current: currentProgress.value,
          total: totalFiles
        });
      }
    }
  }

  // 2. Upload media folder
  const mediaStats = await uploadDirectoryRecursive(
    accessToken,
    localMediaDir,
    progressCallback,
    totalFiles,
    currentProgress,
    '/local_media',
    remoteFilesMap
  );

  const totalUploaded = mediaStats.uploaded + dbUploaded;
  const totalSkipped = mediaStats.skipped + dbSkipped;

  if (mediaStats.errors > 0 && totalUploaded === 0 && totalFiles > 1) {
    throw new Error(`Media backup failed: All media file uploads failed.`);
  }

  // Save push sync statistics
  const syncInfo = {
    lastPushTime: new Date().toISOString(),
    filesUploaded: totalUploaded,
    filesSkipped: totalSkipped,
    errors: mediaStats.errors
  };
  fs.writeFileSync(
    path.join(app.getPath('userData'), 'drive-sync-info.json'),
    JSON.stringify(syncInfo, null, 2)
  );

  logToFile(`Push complete. Uploaded: ${totalUploaded}, Skipped: ${totalSkipped}, Errors: ${mediaStats.errors}`);
  return {
    success: mediaStats.errors === 0,
    uploaded: totalUploaded,
    skipped: totalSkipped,
    errors: mediaStats.errors
  };
}

async function pullFromCloud(localMediaDir, dbPath, progressCallback) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Dropbox');

  logToFile('Pull from Dropbox started...');

  // Get remote file catalog
  let remoteFiles = [];
  try {
    remoteFiles = await listFolder(accessToken, "");
  } catch (err) {
    if (err.message.includes('path/not_found')) {
      logToFile('No files found on Dropbox.');
      return { success: true, downloaded: 0, skipped: 0, errors: 0 };
    }
    throw err;
  }

  // Separate database and media files
  const dbFile = remoteFiles.find(e => e.path_display === '/database.sqlite' && e['.tag'] === 'file');
  const mediaFiles = remoteFiles.filter(e => e.path_display.startsWith('/local_media/') && e['.tag'] === 'file');

  const totalFiles = (dbFile ? 1 : 0) + mediaFiles.length;
  let current = 0;
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  // 1. Download database.sqlite if newer
  if (dbFile) {
    current++;
    let shouldDownload = !fs.existsSync(dbPath);
    if (!shouldDownload && fs.existsSync(dbPath)) {
      const localStat = fs.statSync(dbPath);
      const remoteTime = new Date(dbFile.client_modified || dbFile.server_modified);
      // Use 2-second threshold to handle filesystem timestamp rounding differences
      shouldDownload = (remoteTime.getTime() - localStat.mtime.getTime()) > 2000;
    }

    if (shouldDownload) {
      try {
        if (progressCallback) {
          progressCallback({ phase: 'downloading', file: '/database.sqlite', current, total: totalFiles });
        }
        await downloadFile(accessToken, '/database.sqlite', dbPath);
        const remoteTime = new Date(dbFile.client_modified || dbFile.server_modified);
        try {
          fs.utimesSync(dbPath, remoteTime, remoteTime);
        } catch (utimeErr) {
          logToFile(`Warning: Failed to set modification time for database: ${utimeErr.message}`);
        }
        downloaded++;
      } catch (err) {
        logToFile('Failed to download database: ' + err.message);
        throw new Error(`Database sync download failed: ${err.message}`);
      }
    } else {
      skipped++;
    }
  }

  // 2. Download media files incrementally
  for (const file of mediaFiles) {
    current++;
    // Convert dropbox path like '/local_media/courses/pic.png' to local path
    const relativePath = file.path_display.slice('/local_media/'.length);
    const destLocalPath = path.join(localMediaDir, relativePath);

    let shouldDownload = !fs.existsSync(destLocalPath);
    if (!shouldDownload && fs.existsSync(destLocalPath)) {
      const localStat = fs.statSync(destLocalPath);
      const remoteTime = new Date(file.client_modified || file.server_modified);
      // Use 2-second threshold to handle filesystem timestamp rounding differences
      shouldDownload = (remoteTime.getTime() - localStat.mtime.getTime()) > 2000;
    }

    if (shouldDownload) {
      try {
        if (progressCallback) {
          progressCallback({ phase: 'downloading', file: file.path_display, current, total: totalFiles });
        }
        await downloadFile(accessToken, file.path_display, destLocalPath);
        const remoteTime = new Date(file.client_modified || file.server_modified);
        try {
          fs.utimesSync(destLocalPath, remoteTime, remoteTime);
        } catch (utimeErr) {
          logToFile(`Warning: Failed to set modification time for ${destLocalPath}: ${utimeErr.message}`);
        }
        downloaded++;
      } catch (err) {
        logToFile(`Failed to download ${file.path_display}: ` + err.message);
        throw new Error(`Media file sync download failed: ${err.message}`);
      }
    } else {
      skipped++;
    }
  }

  // Save sync info
  const syncInfo = {
    lastPullTime: new Date().toISOString(),
    filesDownloaded: downloaded,
    errors
  };
  const syncInfoPath = path.join(app.getPath('userData'), 'drive-sync-info.json');
  let existing = {};
  if (fs.existsSync(syncInfoPath)) {
    try { existing = JSON.parse(fs.readFileSync(syncInfoPath, 'utf8')); } catch {}
  }
  fs.writeFileSync(syncInfoPath, JSON.stringify({ ...existing, ...syncInfo }, null, 2));

  logToFile(`Pull complete. Downloaded: ${downloaded}, Skipped: ${skipped}, Errors: ${errors}`);
  return {
    success: true,
    downloaded,
    skipped,
    errors
  };
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
  pushSingleFile,
  getSyncStatus
};
