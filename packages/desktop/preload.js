const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  testConnection: (credentials) => ipcRenderer.invoke('test-connection', credentials),

  // Audit
  runAudit: (url) => ipcRenderer.invoke('run-audit', url),
  onAuditProgress: (callback) => {
    ipcRenderer.on('audit-progress', (event, message) => callback(message));
  },

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
