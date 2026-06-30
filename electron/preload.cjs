const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  querySqlite: (queryDesc) => ipcRenderer.invoke('query-sqlite', queryDesc),
  saveMedia: (bucketName, filePath, fileArray, fileType) => ipcRenderer.invoke('save-media', { bucketName, filePath, fileArray, fileType }),
  signIn: (email, password) => ipcRenderer.invoke('sign-in', { email, password }),
  signUp: (email, password) => ipcRenderer.invoke('sign-up', { email, password }),

  // Dropbox sync
  dropboxAuth: () => ipcRenderer.invoke('dropbox-auth'),
  dropboxSignOut: () => ipcRenderer.invoke('dropbox-sign-out'),
  dropboxAuthStatus: () => ipcRenderer.invoke('dropbox-auth-status'),
  dropboxPush: () => ipcRenderer.invoke('dropbox-push'),
  dropboxPull: () => ipcRenderer.invoke('dropbox-pull'),
  dropboxSyncStatus: () => ipcRenderer.invoke('dropbox-sync-status'),
  onDropboxSyncProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('dropbox-sync-progress', handler);
    return () => ipcRenderer.removeListener('dropbox-sync-progress', handler);
  },
  onDropboxSyncReload: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('dropbox-sync-reload', handler);
    return () => ipcRenderer.removeListener('dropbox-sync-reload', handler);
  },
});
