const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neotraductor', {
  translate: (params) => ipcRenderer.invoke('translate', params),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (updates) => ipcRenderer.invoke('set-config', updates),
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  onFocusInput: (callback) => ipcRenderer.on('focus-input', () => callback())
});
