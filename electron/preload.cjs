const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  querySqlite: (queryDesc) => ipcRenderer.invoke('query-sqlite', queryDesc),
  saveMedia: (bucketName, filePath, fileArray, fileType) => ipcRenderer.invoke('save-media', { bucketName, filePath, fileArray, fileType }),
  signIn: (email, password) => ipcRenderer.invoke('sign-in', { email, password }),
  signUp: (email, password) => ipcRenderer.invoke('sign-up', { email, password })
});
