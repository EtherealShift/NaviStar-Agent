const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const DEFAULT_BACKEND_PORT = 8000;
let backendProcess = null;
let backendPort = DEFAULT_BACKEND_PORT;

function backendBaseUrl() {
  return `http://127.0.0.1:${backendPort}`;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findBackendPort() {
  for (let port = DEFAULT_BACKEND_PORT; port < DEFAULT_BACKEND_PORT + 50; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error('No available backend port found.');
}

async function isBackendReady() {
  try {
    const response = await fetch(`${backendBaseUrl()}/ai/chat/query_list`);
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}

async function startBackend() {
  if (isDev || backendProcess) return;
  backendPort = await findBackendPort();
  if (await isBackendReady()) return;

  const backendPath = process.platform === 'win32'
    ? path.join(process.resourcesPath, 'backend', 'NaviStarBackend.exe')
    : path.join(process.resourcesPath, 'backend', 'NaviStarBackend');
  backendProcess = spawn(
    backendPath,
    [],
    {
      cwd: path.dirname(backendPath),
      env: {
        ...process.env,
        NAVISTAR_PRODUCTION: '1',
        NAVISTAR_BACKEND_PORT: String(backendPort),
      },
      windowsHide: true,
      stdio: 'ignore',
    },
  );

  backendProcess.on('exit', () => {
    backendProcess = null;
  });
}

async function waitForBackend(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function stopBackend() {
  if (!backendProcess) return;
  backendProcess.kill();
  backendProcess = null;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#111113',
    title: 'NaviStar',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111113',
      symbolColor: '#d4d4d8',
      height: 42,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:get-api-base-url', () => backendBaseUrl());
  try {
    await startBackend();
    if (!isDev) waitForBackend();
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});
