const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");

const apiBaseUrl = process.env.NAVISTAR_API_BASE_URL || "http://127.0.0.1:8000";
const devServerUrl = process.env.NAVISTAR_DESKTOP_DEV_URL;
const openDevtools = process.env.NAVISTAR_OPEN_DEVTOOLS === "1";

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#090a0b",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`[NaviStar] Failed to load ${url}: ${code} ${description}`);
  });

  if (openDevtools) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

ipcMain.handle("navistar:get-api-base-url", () => apiBaseUrl);
ipcMain.handle("navistar:open-external", async (_event, url) => {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("navistar:window-action", (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  if (action === "minimize") win.minimize();
  if (action === "maximize") {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
  if (action === "close") win.close();
  return true;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
