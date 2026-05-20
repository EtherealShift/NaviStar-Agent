const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navistar', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  platform: process.platform,
});
