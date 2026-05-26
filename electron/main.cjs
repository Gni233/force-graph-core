const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Vite 开发服务器 URL
const DEV_URL = 'http://localhost:5174';
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Force Graph',
    backgroundColor: '#1e1e22',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发模式加载 Vite dev server，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // 无边框窗口 + 主题适配（菜单由 renderer 自行管理）
  Menu.setApplicationMenu(null);

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximize-change', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximize-change', false));
}

// IPC：文件系统操作（完全脱离浏览器沙箱）
ipcMain.handle('fs-read-file', async (_, filePath) => {
  try { return fs.readFileSync(filePath, 'utf-8'); }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-write-file', async (_, filePath, content) => {
  try { fs.writeFileSync(filePath, content, 'utf-8'); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-read-dir', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, kind: e.isDirectory() ? 'directory' : 'file' }));
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-mkdir', async (_, dirPath) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-delete', async (_, targetPath) => {
  try { fs.rmSync(targetPath, { recursive: true }); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-rename', async (_, oldPath, newPath) => {
  try { fs.renameSync(oldPath, newPath); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-copy', async (_, src, dst) => {
  try { fs.copyFileSync(src, dst); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('fs-exists', async (_, p) => fs.existsSync(p));
ipcMain.handle('fs-stat', async (_, p) => {
  try { const s = fs.statSync(p); return { size: s.size, mtime: s.mtimeMs, isDir: s.isDirectory() }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle('dialog-open-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('dialog-open-file', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('dialog-save-file', async (_, defaultName) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName });
  return r.canceled ? null : r.filePath;
});

// 主题适配：渲染进程通知主进程更新窗口颜色
ipcMain.handle('set-titlebar-color', async (_, bgColor) => {
  if (mainWindow) {
    mainWindow.setBackgroundColor(bgColor);
  }
});

// 窗口控制
ipcMain.on('open-external', (_, url) => shell.openExternal(url));
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

// 应用配置持久化（写入 userData 目录，不依赖 localStorage）
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}
ipcMain.handle('config-read', () => {
  try { return JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8')); }
  catch { return {}; }
});
ipcMain.handle('config-write', (_, updates) => {
  try {
    const cp = getConfigPath();
    const current = (() => { try { return JSON.parse(fs.readFileSync(cp, 'utf-8')); } catch { return {}; } })();
    Object.assign(current, updates);
    fs.writeFileSync(cp, JSON.stringify(current, null, 2), 'utf-8');
    return { ok: true };
  } catch (e) { return { error: e.message }; }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
