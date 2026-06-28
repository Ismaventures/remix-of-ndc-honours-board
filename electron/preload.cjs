const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  querySqlite: (queryDesc) => ipcRenderer.invoke('query-sqlite', queryDesc),
  saveMedia: (bucketName, filePath, fileArray, fileType) => ipcRenderer.invoke('save-media', { bucketName, filePath, fileArray, fileType }),
  signIn: (email, password) => ipcRenderer.invoke('sign-in', { email, password }),
  signUp: (email, password) => ipcRenderer.invoke('sign-up', { email, password }),

  // Google Drive sync
  driveAuth: () => ipcRenderer.invoke('drive-auth'),
  driveSignOut: () => ipcRenderer.invoke('drive-sign-out'),
  driveAuthStatus: () => ipcRenderer.invoke('drive-auth-status'),
  drivePush: () => ipcRenderer.invoke('drive-push'),
  drivePull: () => ipcRenderer.invoke('drive-pull'),
  driveSyncStatus: () => ipcRenderer.invoke('drive-sync-status'),
  onDriveSyncProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('drive-sync-progress', handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('drive-sync-progress', handler);
  },
  onDriveSyncReload: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('drive-sync-reload', handler);
    return () => ipcRenderer.removeListener('drive-sync-reload', handler);
  },
});
