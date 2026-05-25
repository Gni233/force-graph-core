const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
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
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e22',
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

  // 菜单：文件操作
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '打开目录',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-folder'),
        },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    { label: '视图', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] },
  ]);
  Menu.setApplicationMenu(menu);
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
    const isDark = isColorDark(bgColor);
    mainWindow.setBackgroundColor(bgColor);
    // Windows: 设置标题栏颜色
    if (process.platform === 'win32') {
      mainWindow.setTitleBarOverlay({ color: bgColor, symbolColor: isDark ? '#ffffff' : '#000000' });
    }
    // macOS: 设置 traffic light 颜色
    if (process.platform === 'darwin') {
      mainWindow.setTitleBarOverlay({ color: bgColor, symbolColor: isDark ? '#ffffff' : '#000000', height: 36 });
    }
  }
});

function isColorDark(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
