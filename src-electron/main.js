const { app, BrowserWindow, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

let mainWindow;
let pythonProcess;
let backendPort = 9876;
let backendReady = false;

function getPythonCmd() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = require('net').createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function startBackend() {
  backendPort = await findFreePort();

  if (app.isPackaged) {
    const exePath = path.join(process.resourcesPath, 'backend', 'reuse-hub-backend.exe');
    pythonProcess = spawn(exePath, [String(backendPort)], { stdio: ['ignore', 'pipe', 'pipe'] });
  } else {
    const pythonCmd = getPythonCmd();
    const serverPath = path.join(__dirname, '..', 'server.py');
    pythonProcess = spawn(pythonCmd, [serverPath, String(backendPort)], { stdio: ['ignore', 'pipe', 'pipe'] });
  }

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    backendReady = false;
  });

  await waitForBackend();
}

function waitForBackend(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    function check(remaining) {
      const req = http.get(`http://127.0.0.1:${backendPort}/api/items`, (res) => {
        if (res.statusCode === 200) {
          backendReady = true;
          resolve();
        } else if (remaining > 0) {
          setTimeout(() => check(remaining - 1), delay);
        } else {
          reject(new Error('Backend did not start in time'));
        }
      });
      req.on('error', () => {
        if (remaining > 0) {
          setTimeout(() => check(remaining - 1), delay);
        } else {
          reject(new Error('Backend did not start in time'));
        }
      });
      req.end();
    }
    check(retries);
  });
}

function backendRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, `http://127.0.0.1:${backendPort}`);
    const options = {
      hostname: '127.0.0.1',
      port: backendPort,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const GH_OWNER = 'mobogreatthegreat';
const GH_REPO = 'Reuse-Hub';

ipcMain.handle('update:check', () => {
  return new Promise((resolve) => {
    const req = https.get(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Reuse-Hub' },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const latest = data.tag_name?.replace(/^v/, '') || '';
          const current = app.getVersion();
          if (latest && compareVersions(latest, current) > 0) {
            resolve({ hasUpdate: true, version: latest, url: data.html_url });
          } else {
            resolve({ hasUpdate: false });
          }
        } catch {
          resolve({ hasUpdate: false });
        }
      });
    });
    req.on('error', () => resolve({ hasUpdate: false }));
    req.end();
  });
});

ipcMain.handle('update:open', (_event, url) => {
  shell.openExternal(url);
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('backend:request', async (_event, method, urlPath, body) => {
  return await backendRequest(method, urlPath, body);
});

ipcMain.handle('backend:getPort', () => backendPort);

ipcMain.handle('dialog:openImage', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('icon:getFileIcon', async (_event, filePath) => {
  if (!filePath) return null;
  try {
    const icon = await app.getFileIcon(filePath, { size: 'small' });
    return icon.toDataURL();
  } catch {
    return null;
  }
});

ipcMain.handle('dialog:openFile', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'lnk', 'app'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (e) {
    console.error('Failed to start backend:', e.message);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});
