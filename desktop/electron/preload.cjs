const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("navistar", {
  getApiBaseUrl: () => ipcRenderer.invoke("navistar:get-api-base-url"),
  openExternal: (url) => ipcRenderer.invoke("navistar:open-external", url),
  windowAction: (action) => ipcRenderer.invoke("navistar:window-action", action),
});
