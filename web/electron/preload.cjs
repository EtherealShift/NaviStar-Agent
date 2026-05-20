const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navistar', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getApiBaseUrl: () => ipcRenderer.invoke('app:get-api-base-url'),
  platform: process.platform,
});
