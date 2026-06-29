/**
 * Google Drive Sync Module for NDC Honours Board
 * 
 * Mirrors local_media/ and database.sqlite to a Google Drive folder
 * for cross-device sync and cloud backup.
 * 
 * Uses OAuth2 desktop-app flow: opens browser for Google sign-in,
 * stores refresh token in userData/drive-token.json for persistence.
 */

const { google } = require('googleapis');
const { app, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const DRIVE_FOLDER_NAME = 'NDC-Honours-Board-Backup';
const TOKEN_FILENAME = 'drive-token.json';

// ── Helpers ─────────────────────────────────────────────────────────

function getCredentialsPath() {
  // In dev, credentials live next to this file; in production, in extraResources
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, 'drive-credentials.json');
  }
  return path.join(process.resourcesPath, 'drive-credentials.json');
}

function getTokenPath() {
  // Always store token in userData (writable, persists across updates)
  return path.join(app.getPath('userData'), TOKEN_FILENAME);
}

function loadCredentials() {
  const credPath = getCredentialsPath();
  if (!fs.existsSync(credPath)) {
    throw new Error(
      'Google Drive credentials not found. Please place drive-credentials.json ' +
      'in the electron/ folder (dev) or app resources (production).'
    );
  }
  const content = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  // Support both "installed" (Desktop) and "web" credential shapes
  return content.installed || content.web;
}

function loadToken() {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveToken(token) {
  fs.writeFileSync(getTokenPath(), JSON.stringify(token, null, 2));
}

function clearToken() {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
}

// ── OAuth2 ──────────────────────────────────────────────────────────

function createOAuth2Client() {
  const creds = loadCredentials();
  const redirectUri = creds.redirect_uris
    ? creds.redirect_uris[0]
    : 'http://localhost:3456';
  return new google.auth.OAuth2(creds.client_id, creds.client_secret, redirectUri);
}

/**
 * Check if we have a valid stored token.
 * Returns { authenticated: true, email } or { authenticated: false }.
 */
async function getAuthStatus() {
  try {
    const token = loadToken();
    if (!token) return { authenticated: false };

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(token);

    // Verify token using Drive's about API
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { data } = await drive.about.get({ fields: 'user' });
    const user = data.user || {};

    // Refresh the token if it was refreshed during the call
    const newToken = oauth2Client.credentials;
    if (newToken.access_token !== token.access_token) {
      saveToken(newToken);
    }

    return {
      authenticated: true,
      email: user.emailAddress,
      name: user.displayName,
      picture: user.photoLink
    };
  } catch (err) {
    console.error('[DriveSync] Auth status check failed:', err.message);
    return { authenticated: false };
  }
}

/**
 * Start OAuth2 authorization flow.
 * Opens a local HTTP server on port 3456, opens browser to Google consent page,
 * waits for callback, exchanges code for tokens, stores them.
 */
async function authorize() {
  // Use a fixed redirect port for the desktop OAuth flow
  const REDIRECT_PORT = 3456;
  const redirectUri = `http://localhost:${REDIRECT_PORT}`;

  // Re-create the client with the correct redirect URI
  const creds = loadCredentials();
  const client = new google.auth.OAuth2(creds.client_id, creds.client_secret, redirectUri);

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  return new Promise((resolve, reject) => {
    // Start a temporary local HTTP server to receive the OAuth callback
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

        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        saveToken(tokens);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
          <body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4f8;">
            <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
              <h1 style="color:#002060;">✓ Connected to Google Drive</h1>
              <p style="color:#666;">You can close this window and return to the app.</p>
            </div>
          </body>
          </html>
        `);

        server.close();

        // Fetch user info using Drive's about API
        const drive = google.drive({ version: 'v3', auth: client });
        const { data } = await drive.about.get({ fields: 'user' });
        const user = data.user || {};

        resolve({
          authenticated: true,
          email: user.emailAddress,
          name: user.displayName,
          picture: user.photoLink,
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization failed</h1><p>' + err.message + '</p>');
        reject(err);
        server.close();
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`[DriveSync] OAuth callback server listening on port ${REDIRECT_PORT}`);
      // Open the authorization URL in the user's default browser
      shell.openExternal(authUrl);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Sign out: clear stored token.
 */
function signOut() {
  clearToken();
  return { authenticated: false };
}

// ── Drive Operations ────────────────────────────────────────────────

/**
 * Get an authenticated Drive client. Returns null if not authenticated.
 */
function getAuthenticatedClient() {
  const token = loadToken();
  if (!token) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(token);

  // Listen for token refresh events and save them
  oauth2Client.on('tokens', (newTokens) => {
    const merged = { ...token, ...newTokens };
    saveToken(merged);
  });

  return oauth2Client;
}

/**
 * Find or create the backup folder on Drive.
 */
async function getOrCreateSyncFolder(drive) {
  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Find or create a subfolder within a parent folder on Drive.
 */
async function getOrCreateSubfolder(drive, parentId, folderName) {
  const res = await drive.files.list({
    q: `name='${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id;
}

/**
 * Upload a single file to a Drive folder. If the file already exists
 * (by name in the same parent), update it; otherwise create new.
 */
async function uploadFileToDrive(drive, localPath, parentFolderId, fileName) {
  // Check if file already exists in the folder
  const res = await drive.files.list({
    q: `name='${fileName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name, modifiedTime, size)',
  });

  const localStat = fs.statSync(localPath);
  const localSize = localStat.size;
  const localModifiedTime = new Date(localStat.mtime).toISOString();

  const fileMetadata = { name: fileName };
  const media = {
    body: fs.createReadStream(localPath),
  };

  if (res.data.files && res.data.files.length > 0) {
    const driveFile = res.data.files[0];
    const driveSize = parseInt(driveFile.size || '0', 10);
    const driveModTime = new Date(driveFile.modifiedTime);
    const localModTime = new Date(localStat.mtime);

    // Compare file size and modified time (within 2 seconds threshold)
    const timeDiffSeconds = Math.abs(driveModTime.getTime() - localModTime.getTime()) / 1000;
    if (driveSize === localSize && timeDiffSeconds < 2) {
      return { action: 'skipped', fileId: driveFile.id };
    }

    // Update existing file
    const fileId = driveFile.id;
    await drive.files.update({
      fileId,
      media,
      fields: 'id',
    });

    // Set modification time immediately after update
    await drive.files.update({
      fileId,
      requestBody: {
        modifiedTime: localModifiedTime
      },
      fields: 'id, name, modifiedTime, size',
    });

    return { action: 'updated', fileId };
  } else {
    // Create new file
    fileMetadata.parents = [parentFolderId];
    const created = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    const fileId = created.data.id;
    // Set modification time immediately after creation
    await drive.files.update({
      fileId,
      requestBody: {
        modifiedTime: localModifiedTime
      },
      fields: 'id, name, modifiedTime, size',
    });

    return { action: 'created', fileId };
  }
}

/**
 * Download a single file from Drive to a local path.
 */
async function downloadFileFromDrive(drive, fileId, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .pipe(dest);
  });
}

/**
 * Recursively upload a local directory to a Drive folder.
 * Returns { uploaded, skipped, errors } counts.
 * Calls progressCallback({ phase, current, total, file }) on each file.
 */
async function uploadDirectoryToDrive(drive, localDir, parentFolderId, progressCallback, basePath = '') {
  const stats = { uploaded: 0, skipped: 0, errors: 0 };

  if (!fs.existsSync(localDir)) return stats;

  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('.')) continue;

    const localPath = path.join(localDir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subFolderId = await getOrCreateSubfolder(drive, parentFolderId, entry.name);
      const subStats = await uploadDirectoryToDrive(drive, localPath, subFolderId, progressCallback, relativePath);
      stats.uploaded += subStats.uploaded;
      stats.skipped += subStats.skipped;
      stats.errors += subStats.errors;
    } else {
      try {
        if (progressCallback) {
          progressCallback({ phase: 'uploading', file: relativePath });
        }
        const result = await uploadFileToDrive(drive, localPath, parentFolderId, entry.name);
        if (result.action === 'skipped') {
          stats.skipped++;
        } else {
          stats.uploaded++;
        }
      } catch (err) {
        console.error(`[DriveSync] Failed to upload ${relativePath}:`, err.message);
        stats.errors++;
      }
    }
  }

  return stats;
}

/**
 * Recursively download all files from a Drive folder to a local directory.
 * Returns { downloaded, skipped, errors } counts.
 */
async function downloadDirectoryFromDrive(drive, driveFolderId, localDir, progressCallback, basePath = '') {
  const stats = { downloaded: 0, skipped: 0, errors: 0 };

  fs.mkdirSync(localDir, { recursive: true });

  // List all non-trashed files in this folder
  let pageToken = null;
  const allFiles = [];

  do {
    const res = await drive.files.list({
      q: `'${driveFolderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
      pageToken,
      pageSize: 100,
    });
    if (res.data.files) allFiles.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  for (const file of allFiles) {
    const localPath = path.join(localDir, file.name);
    const relativePath = basePath ? `${basePath}/${file.name}` : file.name;

    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Recurse into subfolder
      const subStats = await downloadDirectoryFromDrive(drive, file.id, localPath, progressCallback, relativePath);
      stats.downloaded += subStats.downloaded;
      stats.skipped += subStats.skipped;
      stats.errors += subStats.errors;
    } else {
      try {
        // Compare modification times — only download if Drive version is newer
        if (fs.existsSync(localPath)) {
          const localStat = fs.statSync(localPath);
          const driveModTime = new Date(file.modifiedTime);
          if (localStat.mtime >= driveModTime) {
            stats.skipped++;
            continue;
          }
        }

        if (progressCallback) {
          progressCallback({ phase: 'downloading', file: relativePath });
        }
        await downloadFileFromDrive(drive, file.id, localPath);
        stats.downloaded++;
      } catch (err) {
        console.error(`[DriveSync] Failed to download ${relativePath}:`, err.message);
        stats.errors++;
      }
    }
  }

  return stats;
}

// ── High-Level Sync Functions ───────────────────────────────────────

/**
 * Count local files recursively (for progress reporting).
 */
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

/**
 * Push all local data (database + media) to Google Drive.
 * @param {string} localMediaDir - Path to local_media/
 * @param {string} dbPath - Path to database.sqlite
 * @param {function} progressCallback - Called with { phase, current, total, file }
 */
async function pushToCloud(localMediaDir, dbPath, progressCallback) {
  const auth = getAuthenticatedClient();
  if (!auth) throw new Error('Not authenticated with Google Drive');

  const drive = google.drive({ version: 'v3', auth });
  const rootFolderId = await getOrCreateSyncFolder(drive);

  const totalFiles = countLocalFiles(localMediaDir) + (fs.existsSync(dbPath) ? 1 : 0);
  let current = 0;

  const wrappedProgress = (info) => {
    current++;
    if (progressCallback) {
      progressCallback({ ...info, current, total: totalFiles });
    }
  };

  // 1. Upload database.sqlite
  let dbUploaded = 0;
  let dbSkipped = 0;
  if (fs.existsSync(dbPath)) {
    wrappedProgress({ phase: 'uploading', file: 'database.sqlite' });
    const dbResult = await uploadFileToDrive(drive, dbPath, rootFolderId, 'database.sqlite');
    if (dbResult.action === 'skipped') {
      dbSkipped = 1;
    } else {
      dbUploaded = 1;
    }
  }

  // 2. Upload local_media/ directory
  const mediaFolderId = await getOrCreateSubfolder(drive, rootFolderId, 'local_media');
  const mediaStats = await uploadDirectoryToDrive(drive, localMediaDir, mediaFolderId, wrappedProgress, 'local_media');

  // Save last sync time
  const syncInfo = {
    lastPushTime: new Date().toISOString(),
    filesUploaded: mediaStats.uploaded + dbUploaded,
    errors: mediaStats.errors,
  };
  const syncInfoPath = path.join(app.getPath('userData'), 'drive-sync-info.json');
  fs.writeFileSync(syncInfoPath, JSON.stringify(syncInfo, null, 2));

  return {
    success: true,
    uploaded: mediaStats.uploaded + dbUploaded,
    skipped: mediaStats.skipped + dbSkipped,
    errors: mediaStats.errors,
  };
}

/**
 * Pull all data from Google Drive to local filesystem.
 * @param {string} localMediaDir - Path to local_media/
 * @param {string} dbPath - Path to database.sqlite
 * @param {function} progressCallback - Called with { phase, current, total, file }
 */
async function pullFromCloud(localMediaDir, dbPath, progressCallback) {
  const auth = getAuthenticatedClient();
  if (!auth) throw new Error('Not authenticated with Google Drive');

  const drive = google.drive({ version: 'v3', auth });

  // Find the sync folder
  const res = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  if (!res.data.files || res.data.files.length === 0) {
    return { success: true, downloaded: 0, skipped: 0, errors: 0, message: 'No backup folder found on Drive' };
  }

  const rootFolderId = res.data.files[0].id;

  // 1. Download database.sqlite (if newer on Drive)
  const dbFiles = await drive.files.list({
    q: `name='database.sqlite' and '${rootFolderId}' in parents and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name, modifiedTime)',
  });

  let dbDownloaded = 0;
  if (dbFiles.data.files && dbFiles.data.files.length > 0) {
    const driveDb = dbFiles.data.files[0];
    let shouldDownload = !fs.existsSync(dbPath);

    if (!shouldDownload && fs.existsSync(dbPath)) {
      const localStat = fs.statSync(dbPath);
      const driveModTime = new Date(driveDb.modifiedTime);
      shouldDownload = driveModTime > localStat.mtime;
    }

    if (shouldDownload) {
      if (progressCallback) {
        progressCallback({ phase: 'downloading', file: 'database.sqlite', current: 1, total: 1 });
      }
      await downloadFileFromDrive(drive, driveDb.id, dbPath);
      dbDownloaded = 1;
    }
  }

  // 2. Download local_media/ folder
  const mediaFolders = await drive.files.list({
    q: `name='local_media' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id, name)',
  });

  let mediaStats = { downloaded: 0, skipped: 0, errors: 0 };
  if (mediaFolders.data.files && mediaFolders.data.files.length > 0) {
    const mediaFolderId = mediaFolders.data.files[0].id;
    mediaStats = await downloadDirectoryFromDrive(drive, mediaFolderId, localMediaDir, progressCallback, 'local_media');
  }

  // Save last sync time
  const syncInfo = {
    lastPullTime: new Date().toISOString(),
    filesDownloaded: mediaStats.downloaded + dbDownloaded,
    errors: mediaStats.errors,
  };
  const syncInfoPath = path.join(app.getPath('userData'), 'drive-sync-info.json');
  // Merge with existing sync info
  let existing = {};
  if (fs.existsSync(syncInfoPath)) {
    try { existing = JSON.parse(fs.readFileSync(syncInfoPath, 'utf8')); } catch {}
  }
  fs.writeFileSync(syncInfoPath, JSON.stringify({ ...existing, ...syncInfo }, null, 2));

  return {
    success: true,
    downloaded: mediaStats.downloaded + dbDownloaded,
    skipped: mediaStats.skipped,
    errors: mediaStats.errors,
  };
}

/**
 * Push a single file to Drive (used for auto-sync after media upload).
 * @param {string} localPath - Absolute path to the file
 * @param {string} relativePath - Relative path within the backup folder (e.g. "local_media/ndc-media/images/foo.png")
 */
async function pushSingleFile(localPath, relativePath) {
  const auth = getAuthenticatedClient();
  if (!auth) return; // Silently skip if not authenticated

  try {
    const drive = google.drive({ version: 'v3', auth });
    const rootFolderId = await getOrCreateSyncFolder(drive);

    // Walk the relative path to create/find folders
    const parts = relativePath.split('/');
    const fileName = parts.pop();
    let currentFolderId = rootFolderId;

    for (const part of parts) {
      currentFolderId = await getOrCreateSubfolder(drive, currentFolderId, part);
    }

    await uploadFileToDrive(drive, localPath, currentFolderId, fileName);
    console.log(`[DriveSync] Auto-pushed: ${relativePath}`);
  } catch (err) {
    console.error(`[DriveSync] Auto-push failed for ${relativePath}:`, err.message);
  }
}

/**
 * Get sync status information.
 */
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

// ── Exports ─────────────────────────────────────────────────────────

module.exports = {
  authorize,
  signOut,
  getAuthStatus,
  pushToCloud,
  pullFromCloud,
  pushSingleFile,
  getSyncStatus,
};
