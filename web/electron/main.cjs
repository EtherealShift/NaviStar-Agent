const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const net = require('node:net');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const DEFAULT_BACKEND_PORT = 8000;
const gotSingleInstanceLock = app.requestSingleInstanceLock();
let backendProcess = null;
let backendPid = null;
let backendPort = DEFAULT_BACKEND_PORT;
let backendExecutablePath = null;
let mainWindow = null;
let backendStopping = false;

if (!gotSingleInstanceLock) {
  app.quit();
}

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
  backendExecutablePath = backendPath;
  backendProcess = spawn(
    backendPath,
    [],
    {
      cwd: path.dirname(backendPath),
      env: {
        ...process.env,
        NAVISTAR_PRODUCTION: '1',
        NAVISTAR_BACKEND_PORT: String(backendPort),
        NAVISTAR_PARENT_PID: String(process.pid),
      },
      windowsHide: true,
      stdio: 'ignore',
    },
  );

  backendProcess.on('exit', () => {
    backendProcess = null;
    backendPid = null;
  });
  backendPid = backendProcess.pid;
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
  if (backendStopping) return;
  backendStopping = true;

  const pid = backendPid || backendProcess?.pid;
  if (!pid && !backendExecutablePath) {
    backendStopping = false;
    return;
  }

  if (process.platform === 'win32') {
    if (pid) {
      spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    }
    if (backendExecutablePath) {
      const escapedPath = backendExecutablePath.replace(/'/g, "''");
      spawnSync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'NaviStarBackend.exe' -and $_.ExecutablePath -eq '${escapedPath}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ], {
        stdio: 'ignore',
        windowsHide: true,
      });
    }
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Process already exited.
    }
  }

  backendProcess = null;
  backendPid = null;
  backendStopping = false;
}

async function showApp(mainWindow) {
  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
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
    await showApp(mainWindow);
  } else {
    await mainWindow.loadFile(path.join(__dirname, 'startup.html'));
  }

  mainWindow.on('close', () => {
    if (!isDev) stopBackend();
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:get-api-base-url', () => backendBaseUrl());
  const createdWindow = await createWindow();

  if (!isDev) {
    try {
      await startBackend();
      await waitForBackend();
    } catch (error) {
      console.error('Failed to start backend:', error);
    }
    if (!createdWindow.isDestroyed()) {
      await showApp(createdWindow);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('quit', () => {
  stopBackend();
});

process.on('exit', () => {
  stopBackend();
});

process.on('SIGINT', () => {
  stopBackend();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopBackend();
  process.exit(0);
});
