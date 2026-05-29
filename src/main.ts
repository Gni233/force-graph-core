import * as d3 from 'd3';
(window as any).d3 = d3;

import { sharedState } from './shared-state';
import { createStorage, GraphData, GraphSettings } from './data/storage';
import { createSimManager } from './graph-sim';
import { setupCanvasEvents } from './ui-events';
import { showContextMenu } from './ui-contextmenu';
import { createEditPanel } from './ui-edit';
import { buildSettings } from './ui-settings';
import { getTheme, applyThemeVars, ThemeConfig } from './theme';
import { createSidebar } from './ui-sidebar';
import { createTabBar } from './ui-tabs';
import { openFolder, restoreFolder, listFileTree, flatFilePaths, readGraphFile, writeGraphFile, deleteFile, renameFile } from './file-system';
import { saveFolderHandle, loadFolderHandle, clearFolderHandle } from './folder-store';
import { isCapacitor, importFilesMobile, pickDirectoryAndImport, listFilesMobile, readFileMobile, writeFileMobile, deleteFileMobile, downloadApk, downloadReleaseApk, installApk } from './fs-mobile';
import { safPickDirectory, safRestoreDirectory, safListFiles, safReadFile, safWriteFile, safDeleteFile, safIsAvailable } from './saf-bridge';
import { isHarmonyOS } from './utils/platform';
import { listFilesHarmony, readFileHarmony, writeFileHarmony, deleteFileHarmony, importFilesHarmony } from './fs-harmony';
import { safePrompt } from './dialog';
import { checkUpdate, UpdateInfo } from './update-checker';
import { showUpdateDialog } from './update-dialog';
import { DEMO_DATA } from './demo-data';
import { BlurFilter, Graphics } from 'pixi.js';
import { createThresholdFilter } from './pixi-fluid';
import { showMedia, positionMedia, hideMedia, isExpanded, clearAllMedia } from './media-nodes';
import { createSettingsPanel } from './settings-panel';
import { UndoManager } from './undo-redo';
import { showToast, confirmAction } from './toast';
import { startNodeAnimation } from './utils/animate-nodes';
import { SIDEBAR_LEFT, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_MIN_WIDTH, sidebarExpandedLeft, sidebarCollapsedLeft, getResponsiveSidebarWidth, Z_CANVAS, Z_LOADING, Z_FLOATING_UI, Z_MEDIA_OVERLAY, Z_EDIT_PANEL, Z_SELECTION_BOX, Z_SETTINGS_PANEL, Z_DROPDOWN, Z_CONTEXT_MENU, Z_WINDOW_CONTROLS, Z_STATS, Z_TOAST, WIN_CONTROLS_WIDTH, LAYOUT_ANIM_DURATION, SEARCH_MOVE_DURATION, FIT_ALL_DURATION } from './layout-constants';
(window as any).__triggerSave = () => {};
import { createPixiApp, PixiLayers } from './pixi-app';
import { createNodeSprite, updateNodePosition, applyNodeVisual, NodeSprite, NodeVisualState } from './pixi-nodes';
import { updateEdges } from './pixi-edges';
import { updateGroups } from './pixi-groups';
import { updateGrid, clearGridCache } from './pixi-grid';

const DEFAULT_SETTINGS: GraphSettings = {
  linkDist: 120, labelSize: 18, charge: -100, linkStr: 0.3,
  collideR: 10, centerS: 0.02, groupBound: 0.8,
  heatingTime: 2, alphaTarget: 0.3, editPanelOpacity: 0.9,
  useRAFL: true, nodeExpand: 8, lineExpand: 6,
  showGLabels: true, glMin: 10, glMax: 28,
  gridVis: true, axisVis: true, axisTicks: true, gridSp: 30,
  ar: 0.75, graphTheme: 'nord-dark', focusMode: false, fluidAppearance: false, glowAppearance: false, gravityGrid: false, gridWidth: 0.5, categoryLayout: false,
};

async function main() {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  // CSS variable helper for inline styles (fallback for pre-theme state)
  const V = (name: string, fallback: string) => `var(${name},${fallback})`;

  // ===== 布局：全屏画布 + 玻璃悬浮 UI =====
  const appShell = document.createElement('div');
  appShell.style.cssText = 'position:relative;width:100vw;height:100vh;overflow:hidden;';
  appEl.appendChild(appShell);

  // 玻璃效果现在通过 CSS 类 .fg-glass 实现，定义在 index.html 中
  // 所有 UI 组件使用 CSS 变量 var(--fg-xxx)，由 applyThemeVars() 统一设置

  // --- 窗口控制按钮（仅 Electron 桌面端）---
  const isElectron = !!(window as any).electronAPI;
  const floatingRight = isElectron ? `${WIN_CONTROLS_WIDTH + 6}px` : '6px';

  if (isElectron) {
    const winCtrls = document.createElement('div');
    winCtrls.style.cssText = `position:absolute;top:4px;right:6px;z-index:${Z_WINDOW_CONTROLS};display:flex;gap:4px;`;

    function makeWinBtn(label: string, hoverBg: string) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'fg-glass';
      btn.style.cssText = 'width:30px;height:26px;border:none;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;cursor:pointer;padding:0;transition:background 0.15s;border-radius:6px;';
      btn.addEventListener('mouseenter', () => { btn.style.background = hoverBg; });
      btn.addEventListener('mouseleave', () => { btn.style.background = ''; });
      return btn;
    }

    const btnMin = makeWinBtn('\u2500', 'rgba(255,255,255,0.12)'); // ─
    const btnMax = makeWinBtn('\u25A1', 'rgba(255,255,255,0.12)'); // □
    const btnClose = makeWinBtn('\u2715', 'rgba(232,68,68,0.85)'); // ✕

    const api = (window as any).electronAPI;
    btnMin.addEventListener('click', () => api.minimizeWindow());
    btnMax.addEventListener('click', () => api.maximizeWindow());
    btnClose.addEventListener('click', () => api.closeWindow());
    api.onMaximizeChange((maximized: boolean) => {
      btnMax.textContent = maximized ? '\u25A3' : '\u25A1'; // ▣ / □
    });

    winCtrls.appendChild(btnMin);
    winCtrls.appendChild(btnMax);
    winCtrls.appendChild(btnClose);
    appShell.appendChild(winCtrls);
  }

  // --- 浮动顶栏（标签 + 搜索 + 操作）---
  const floatingTop = document.createElement('div');
  floatingTop.className = 'fg-glass';
  floatingTop.className = 'fg-glass' + (isElectron ? ' fg-drag-region' : '');
  floatingTop.style.cssText = `position:absolute;left:${sidebarExpandedLeft()}px;top:6px;right:${floatingRight};z-index:${Z_FLOATING_UI};display:flex;flex-direction:column;gap:4px;padding:4px 8px 6px 8px;transition:left 0.25s ease;`;
  appShell.appendChild(floatingTop);

  // --- 标签栏 ---
  let renderTabs: (tabs: string[], active: string, dirtyFiles?: Set<string>) => void;
  const tabBarInit = createTabBar(floatingTop, {
    onSwitchTab: (fileName) => { switchTab(fileName); },
    onCloseTab: (fileName) => { closeTab(fileName); },
    onNewTab: () => { createNewTab(); },
    onReorder: (from, to) => {
      const item = openTabs.splice(from, 1)[0];
      openTabs.splice(to, 0, item);
      renderAllTabs();
      persistTabs();
    },
  });
  renderTabs = tabBarInit.renderTabs;

  // --- 搜索栏 ---
  const searchRow = document.createElement('div');
  searchRow.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;flex-shrink:0;';
  const searchLabel = document.createElement('span');
  searchLabel.textContent = '搜索:';
  searchLabel.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};color:${V('--fg-text-muted', '#999')};flex-shrink:0;`;
  searchRow.appendChild(searchLabel);
  const fieldSelect = document.createElement('select');
  fieldSelect.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};`;
  ['名', '签', '内'].forEach((t, i) => { const o = document.createElement('option'); o.value = ['name', 'tags', 'note'][i]; o.textContent = t; o.title = ['名称', '标签', '内容'][i]; fieldSelect.appendChild(o); });
  searchRow.appendChild(fieldSelect);
  const matchModeSelect = document.createElement('select');
  matchModeSelect.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};`;
  ['含', '头', '尾', '模'].forEach((t, i) => { const o = document.createElement('option'); o.value = ['contains', 'startsWith', 'endsWith', 'fuzzy'][i]; o.textContent = t; o.title = ['包含', '开头', '结尾', '模糊'][i]; matchModeSelect.appendChild(o); });
  searchRow.appendChild(matchModeSelect);
  const modeSelect = document.createElement('select');
  modeSelect.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};`;
  ['亮', '仅'].forEach((t, i) => { const o = document.createElement('option'); o.value = ['highlight', 'show'][i]; o.textContent = t; o.title = ['高亮', '只显示'][i]; modeSelect.appendChild(o); });
  searchRow.appendChild(modeSelect);
  const searchInput = document.createElement('input');
  searchInput.type = 'text'; searchInput.placeholder = '搜索...';
  searchInput.style.cssText = `flex:1;min-width:80px;font-size:${V('--fg-font-sm', '0.8em')};padding:2px 6px;`;
  searchRow.appendChild(searchInput);
  const searchStatus = document.createElement('span');
  searchStatus.style.cssText = `font-size:${V('--fg-font-xs', '0.72em')};color:${V('--fg-danger','#e03030')};display:none;white-space:nowrap;`;
  searchRow.appendChild(searchStatus);
  floatingTop.appendChild(searchRow);

  // --- 主要操作按钮行（始终可见）---
  const primaryRow = document.createElement('div');
  primaryRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0;';
  floatingTop.appendChild(primaryRow);

  // --- 操作栏（折叠区：低频操作）---
  const controlsDetails = document.createElement('details');
  const controlsSum = document.createElement('summary');
  controlsSum.textContent = '更多操作';
  controlsSum.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};cursor:pointer;`;
  controlsDetails.appendChild(controlsSum);
  const controlsDiv = document.createElement('div');
  controlsDiv.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:4px 0;';
  controlsDetails.appendChild(controlsDiv);
  floatingTop.appendChild(controlsDetails);

  // --- PixiJS 画布容器（全屏背景）---
  const pixiContainer = document.createElement('div');
  pixiContainer.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;z-index:${Z_CANVAS};overflow:hidden;`;
  appShell.appendChild(pixiContainer);

  // 统计栏
  const statsEl = document.createElement('div');
  statsEl.style.cssText = `position:fixed;right:10px;bottom:4px;z-index:${Z_STATS};font-size:${V('--fg-font-xs', '0.72em')};color:${V('--fg-text-muted','#aaa')};pointer-events:none;`;
  document.body.appendChild(statsEl);

  // 加载遮罩
  const loadingOverlay = document.createElement('div');
  loadingOverlay.style.cssText = `position:absolute;inset:0;z-index:${Z_LOADING};background:rgba(0,0,0,0.3);display:none;align-items:center;justify-content:center;font-size:1.2em;color:${V('--fg-text-muted','#999')};`;
  loadingOverlay.textContent = '加载中...';
  appShell.appendChild(loadingOverlay);

  // 多媒体覆盖层容器
  const mediaOverlayContainer = document.createElement('div');
  mediaOverlayContainer.style.cssText = `position:fixed;top:0;left:0;z-index:${Z_MEDIA_OVERLAY};pointer-events:none;`;
  document.body.appendChild(mediaOverlayContainer);

  // PixiJS 初始化（异步）
  let pixi: PixiLayers | null = null;
  const pixiReady = createPixiApp(pixiContainer).then(p => {
    pixi = p;
    pixi.onContextRestored = () => { simManager.initSim(); draw(); };
    return p;
  });

  // 框选矩形
  const selectionBox = document.createElement('div');
  selectionBox.style.cssText = `position:absolute;border:2px dashed ${V('--fg-accent','#5B8FF9')};background:rgba(91,143,249,0.1);display:none;pointer-events:none;z-index:${Z_SELECTION_BOX};`;
  appShell.appendChild(selectionBox);

  // --- 设置折叠区 ---
  const settingsDet = document.createElement('details');
  const settingsSum = document.createElement('summary');
  settingsSum.textContent = '图区设置';
  settingsDet.appendChild(settingsSum);
  const setDiv = document.createElement('div');
  setDiv.style.cssText = 'padding:4px 0;';
  settingsDet.appendChild(setDiv);
  settingsDet.className = 'fg-glass';
  settingsDet.style.cssText = `position:absolute;left:${sidebarExpandedLeft()}px;right:${floatingRight};bottom:6px;z-index:${Z_FLOATING_UI};max-height:40vh;overflow-y:auto;padding:4px 10px;`;
  appShell.appendChild(settingsDet);

  // --- 主题应用函数 ---
  // 通过 CSS 变量统一控制所有 UI 组件的颜色，无需逐元素 querySelectorAll
  const applyTheme = (t: ThemeConfig) => {
    applyThemeVars(document.documentElement, t);
    document.body.style.background = t.canvasBackground;
    pixiContainer.style.background = t.canvasBackground;
    const ea = (window as any).electronAPI;
    if (ea?.setTitlebarColor) ea.setTitlebarColor(t.canvasBackground);
  };

  // --- 检测 backdrop-filter 支持（鸿蒙/HarmonyOS WebView 不支持）---
  const supportsBackdrop = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
  if (!supportsBackdrop) {
    // 将所有玻璃面板降级为实色背景
    document.documentElement.style.setProperty('--fg-surface-glass', 'var(--fg-surface)');
    document.documentElement.style.setProperty('--fg-surface-elevated', 'var(--fg-surface)');
  }

  // ===== 侧边栏 =====
  let openTabs: string[] = [];
  let activeTab = 'demo';
  let fileSystemMountPath: string | null = null; // Electron 模式下的文件夹路径
  const capApp = isCapacitor();
  const isHarmony = !capApp && isHarmonyOS();


  // 存储适配器：所有图统一走 localStorage
  const readGraphData = async (fileName: string): Promise<GraphData | null> => {
    // SAF 目录模式
    if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable() && fileName !== 'demo') {
      try {
        const raw = await safReadFile(fileName);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    // Capacitor Filesystem
    if (fileSystemMountPath === 'graphs' && fileName !== 'demo') {
      try {
        const data = await readFileMobile(fileName);
        if (data) return data;
      } catch {}
    }
    // Electron 模式：从挂载目录读文件
    const ea = (window as any).electronAPI;
    if (ea && fileSystemMountPath && fileSystemMountPath !== 'graphs' && fileName !== 'demo') {
      try {
        const raw = await ea.readFile(fileSystemMountPath + '/' + fileName);
        return raw && !raw.error ? JSON.parse(raw) : null;
      } catch {}
    }
    // 桌面 FileSystemHandle / localStorage 回退
    const store = createStorage(fileName);
    return await store.readData();
  };

  const writeGraphData = async (fileName: string, data: GraphData): Promise<void> => {
    const store = createStorage(fileName);
    await store.writeData(data);
    // SAF 目录模式
    if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable() && fileName !== 'demo') {
      try { await safWriteFile(fileName, JSON.stringify(data, null, 2)); } catch {}
      return;
    }
    // Capacitor Filesystem
    if (fileSystemMountPath === 'graphs' && fileName !== 'demo') {
      try { await writeFileMobile(fileName, data); } catch {}
      return;
    }
    // Electron 模式：同步到挂载目录
    const ea = (window as any).electronAPI;
    if (ea && fileSystemMountPath && fileSystemMountPath !== 'graphs' && fileName !== 'demo') {
      try {
        const ea = (window as any).electronAPI;
        await ea.writeFile(fileSystemMountPath + '/' + fileName, JSON.stringify(data, null, 2));
      } catch {}
    }
  };

  // --- 标签页持久化 ---
  const TABS_KEY = 'fg-open-tabs';
  const ACTIVE_KEY = 'fg-active-tab';
  function persistTabs() {
    localStorage.setItem(TABS_KEY, JSON.stringify(openTabs));
    localStorage.setItem(ACTIVE_KEY, activeTab);
  }
  function restoreTabs(): { tabs: string[]; active: string } | null {
    try {
      const raw = localStorage.getItem(TABS_KEY);
      const active = localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const tabs = JSON.parse(raw);
        if (Array.isArray(tabs) && tabs.length > 0) return { tabs, active: active || tabs[0] };
      }
    } catch {}
    return null;
  }

  const sidebar = createSidebar(appShell, {
    onSelectFile: async (path) => { await openTab(path); },
    onNewFile: async (path) => {
      const presetSettings = Object.keys(presetDefaults).length > 0 ? { ...DEFAULT_SETTINGS, ...presetDefaults } : { ...DEFAULT_SETTINGS };
      const empty: GraphData = { nodes: [], edges: [], groups: [], settings: presetSettings };
      if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable()) {
        try { await safWriteFile(path, JSON.stringify(empty, null, 2)); } catch {}
      } else if (fileSystemMountPath === 'graphs') {
        try { await writeFileMobile(path, empty); } catch {}
      } else if (isHarmony) {
        await writeFileHarmony(path, empty);
      } else {
        await writeGraphFile(path, empty);
      }
      await writeGraphData(path, empty);
      await refreshFileTree();
      await openTab(path);
    },
    onDeleteFile: async (path) => {
      if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable()) {
        try { await safDeleteFile(path); } catch {}
      } else if (fileSystemMountPath === 'graphs') { try { await deleteFileMobile(path); } catch {} }
      else if (isHarmony) { await deleteFileHarmony(path); }
      else { await deleteFile(path); }
      openTabs = openTabs.filter(t => t !== path);
      if (activeTab === path) {
        activeTab = openTabs.length > 0 ? openTabs[openTabs.length - 1] : 'demo';
        await loadGraphData(activeTab);
      }
      renderAllTabs();
      persistTabs();
      await refreshFileTree();
    },
    onRenameFile: async (oldPath, newName) => {
      const newPath = newName.endsWith('.json') ? newName : newName + '.json';
      if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable()) {
        try {
          const content = await safReadFile(oldPath);
          const data = content ? JSON.parse(content) : { nodes: [], edges: [], groups: [] };
          await safWriteFile(newPath, JSON.stringify(data, null, 2));
          await safDeleteFile(oldPath);
        } catch {}
      } else if (fileSystemMountPath === 'graphs') {
        try {
          const content = await readFileMobile(oldPath);
          await writeFileMobile(newPath, content || { nodes: [], edges: [], groups: [] });
          await deleteFileMobile(oldPath);
        } catch {}
      } else if (isHarmony) {
        const content = await readFileHarmony(oldPath);
        await writeFileHarmony(newPath, content || { nodes: [], edges: [], groups: [], settings: { ...DEFAULT_SETTINGS } });
        await deleteFileHarmony(oldPath);
      } else {
        await renameFile(oldPath, newName);
      }
      if (activeTab === oldPath) {
        openTabs = openTabs.map(t => t === oldPath ? newPath : t);
        await loadGraphData(newPath);
        renderAllTabs();
        persistTabs();
      }
      await refreshFileTree();
    },
    onCopyFile: async (path) => {
      const base = path.replace(/\.json$/, '');
      let n = 2; let newPath = base + ' ' + n + '.json';
      if (fileSystemMountPath === 'graphs') {
        try {
          const files = await listFilesMobile();
          while (files.some(f => f.name === newPath)) { n++; newPath = base + ' ' + n + '.json'; }
        } catch {}
      } else if (isHarmony) {
        const files = await listFilesHarmony();
        while (files.some(f => f.name === newPath)) { n++; newPath = base + ' ' + n + '.json'; }
      } else {
        while (flatFilePaths(await listFileTree()).includes(newPath)) { n++; newPath = base + ' ' + n + '.json'; }
      }
      const content = await readGraphData(path);
      await writeGraphData(newPath, content || { nodes: [], edges: [], groups: [], settings: { ...DEFAULT_SETTINGS } });
      await refreshFileTree();
    },
    onNewFolder: async (_path) => {
      if (!isHarmony && fileSystemMountPath !== 'graphs') {
        await writeGraphFile(_path + '/.gitkeep', { nodes: [], edges: [], groups: [], settings: { ...DEFAULT_SETTINGS } });
        await deleteFile(_path + '/.gitkeep');
      }
      await refreshFileTree();
    },
    onMoveFile: async (src, dstDir) => {
      const parts = src.split('/'); const name = parts.pop()!;
      const dstPath = dstDir + '/' + name;
      const content = await readGraphData(src);
      await writeGraphData(dstPath, content || { nodes: [], edges: [], groups: [] });
      if (fileSystemMountPath === 'graphs') { try { await deleteFileMobile(src); } catch {} }
      else if (isHarmony) { await deleteFileHarmony(src); }
      else { await deleteFile(src); }
      if (activeTab === src) { await loadGraphData(dstPath); }
      await refreshFileTree();
    },
    onApplyPreset: () => { settingsPanel.show(); },
    onResetPresets: () => { settingsPanel.show(); },
    onOpenFolder: () => {},
  });

  // 侧边栏玻璃效果
  sidebar.sidebar.className = 'fg-glass';
  sidebar.sidebar.style.cssText = `position:absolute;left:${SIDEBAR_LEFT}px;top:6px;bottom:6px;z-index:${Z_FLOATING_UI};width:${getResponsiveSidebarWidth()}px;min-width:${SIDEBAR_MIN_WIDTH}px;display:flex;flex-direction:column;font-size:${V('--fg-font-md', '0.85em')};overflow:hidden;`;

  const refreshFileTree = async () => {
    // SAF 目录模式（Obsidian 式）
    if (fileSystemMountPath && fileSystemMountPath !== 'graphs' && safIsAvailable()) {
      const files = await safListFiles();
      sidebar.updateFileTree(files, activeTab);
      return;
    }
    // Capacitor Filesystem
    if (fileSystemMountPath === 'graphs') {
      try {
        const files = await listFilesMobile();
        if (files.length > 0 || !isHarmony || isHarmonyOS()) {
          sidebar.updateFileTree(files, activeTab);
          return;
        }
      } catch {}
    }
    // 鸿蒙 localStorage 回退
    if (isHarmony || (!capApp && !(window as any).electronAPI)) {
      const files = await listFilesHarmony();
      if (files.length > 0) {
        sidebar.updateFileTree(files, activeTab);
        return;
      }
    }
    // Electron 模式：直接用 fs 读目录
    const ea = (window as any).electronAPI;
    if (fileSystemMountPath && ea?.readDir) {
      const buildTree = async (dirPath: string): Promise<any[]> => {
        const entries = await ea.readDir(dirPath);
        if (!entries || entries.error) return [];
        const result: any[] = [];
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          if (e.kind === 'directory') {
            result.push({ name: e.name, kind: 'directory', children: await buildTree(dirPath + '/' + e.name) });
          } else if (e.name.endsWith('.json')) {
            result.push({ name: e.name, kind: 'file', children: [] });
          }
        }
        return result;
      };
      const tree = await buildTree(fileSystemMountPath);
      sidebar.updateFileTree(tree, activeTab);
      return;
    }
    const tree = await listFileTree();
    sidebar.updateFileTree(tree, activeTab);
  };

  // 共享的文件导入逻辑（FAB 按钮 + 设置面板"打开目录"共用）
  const triggerFileImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;
    input.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    input.addEventListener('change', async () => {
      const files = input.files;
      input.remove();
      if (!files || files.length === 0) return;
      try {
        try { await importFilesMobile(files); } catch { await importFilesHarmony(files); }
        fileSystemMountPath = 'graphs';
        await refreshFileTree();
        showToast(`已导入 ${files.length} 个文件`, 'success');
      } catch (e) {
        console.error('import error:', e);
        showToast('导入失败', 'error');
      }
    });
    document.body.appendChild(input);
    input.click();
  };

  // ===== 文件夹/文件导入按钮 =====
    const fabBtn = document.createElement('button');
    fabBtn.textContent = '导入 JSON';
    fabBtn.style.cssText =
      'position:fixed;bottom:10px;right:10px;z-index:99999;' +
      `background:${V('--fg-accent','#5B8FF9')};color:#fff;` +
      'padding:10px 16px;font-size:14px;font-weight:bold;' +
      'border:none;border-radius:8px;cursor:pointer;' +
      'box-shadow:0 2px 12px rgba(0,0,0,0.3);';
    fabBtn.onclick = async () => {
      // 优先 SAF 目录选择器
      const c = (window as any).Capacitor;
      if (c?.Plugins?.SafPlugin) {
        try {
          const dir = await safPickDirectory();
          if (dir) {
            fileSystemMountPath = dir.name;
            await refreshFileTree();
            showToast(`已打开: ${dir.name}`, 'success');
            return;
          }
        } catch {}
      }
      // 回退文件导入
      triggerFileImport();
    };
    appShell.appendChild(fabBtn);

  // ===== 图加载函数 =====
  async function loadGraphData(fileName: string) {
    loadingOverlay.style.display = 'flex';
    activeTab = fileName;
    updateGwGh();
    // 先停掉旧模拟，防止异步间隙触发绘制
    simManager.getSim()?.stop();
    // 清除旧节点精灵
    if (pixi) { pixi.nodeLayer.removeChildren(); pixi.edgeLayer.removeChildren(); pixi.blobLayer.removeChildren(); }
    nodeSprites.clear(); clearGridCache();
    const saved = await readGraphData(fileName);
    if (fileName === 'demo') {
      // demo 始终从最新 DEMO_DATA 强制重建
      const demo = JSON.parse(JSON.stringify(DEMO_DATA));
      graph.nodes = demo.nodes;
      graph.edges = demo.edges;
      graph.groups = demo.groups;
      graph.settings = { ...DEFAULT_SETTINGS, ...demo.settings };
      await writeGraphData('demo', graph);
    } else if (saved && saved.nodes && saved.nodes.length > 0) {
      graph.nodes = saved.nodes;
      graph.edges = saved.edges || [];
      graph.groups = saved.groups || [];
      if (saved.settings) graph.settings = saved.settings;
    } else {
      graph.nodes = [];
      graph.edges = [];
      graph.groups = [];
      graph.settings = saved?.settings || { ...DEFAULT_SETTINGS };
    }
    if (graph.settings) {
      const s = graph.settings;
      linkDist = s.linkDist; labelSize = s.labelSize; charge = s.charge; linkStr = s.linkStr;
      collideR = s.collideR; centerS = s.centerS; groupBound = s.groupBound;
      heatingTime = s.heatingTime; alphaTarget = s.alphaTarget;
      editPanelOpacity = s.editPanelOpacity; useRAFL = s.useRAFL;
      nodeExpand = s.nodeExpand; lineExpand = s.lineExpand;
      showGLabels = s.showGLabels; glMin = s.glMin; glMax = s.glMax;
      gridVis = s.gridVis; axisVis = s.axisVis; axisTicks = s.axisTicks;
      gridSp = s.gridSp; gridWidth = s.gridWidth ?? 0.5; ar = s.ar; graphTheme = s.graphTheme || 'default';
      focusMode = s.focusMode ?? false;
      fluidAppearance = s.fluidAppearance ?? false;
      glowAppearance = s.glowAppearance ?? false;
      gravityGrid = s.gravityGrid ?? false;
      categoryLayout = s.categoryLayout ?? false;
    }
    sharedState.setFocusModeFn(() => focusMode);
    applyTheme(getTheme(graphTheme));
    // 若不在布局模式，清除可能残留的固定和布局标记（防脏数据）
    if (activeMode === 'default') {
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; delete (n as any)._pieColors; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      (graph as any)._categoryBoxes = null;
    }
    clearEd(); simManager.initSim();
    updateInfoRef.current();
    loadingOverlay.style.display = 'none';
    setTimeout(() => draw(), 100);
  }

  async function openTab(fileName: string) {
    if (activeTab !== fileName) {
      graph.settings = collectSettings();
      await writeGraphData(activeTab, graph);
    }
    if (!openTabs.includes(fileName)) openTabs.push(fileName);
    activeTab = fileName;
    await loadGraphData(fileName);
    try { loadLayouts(); renderModeBar(); } catch {}
    renderAllTabs();
    persistTabs();
  }

  async function switchTab(fileName: string) {
    if (fileName === activeTab) return;
    graph.settings = collectSettings();
    await writeGraphData(activeTab, graph);
    activeTab = fileName;
    await loadGraphData(fileName);
    try { loadLayouts(); renderModeBar(); } catch {}
    renderAllTabs();
    persistTabs();
  }

  async function closeTab(fileName: string) {
    if (openTabs.length <= 1) return;
    graph.settings = collectSettings();
    await writeGraphData(fileName, graph);
    openTabs = openTabs.filter(t => t !== fileName);
    if (fileName === activeTab) {
      activeTab = openTabs[openTabs.length - 1];
      await loadGraphData(activeTab);
    }
    renderAllTabs();
    persistTabs();
  }

  async function createNewTab() {
    const name = await safePrompt('输入新页面名称:');
    if (!name) return;
    const fileName = name.endsWith('.json') ? name : name + '.json';
    if (openTabs.includes(fileName)) { await switchTab(fileName); return; }
    const presetSettings = Object.keys(presetDefaults).length > 0 ? { ...DEFAULT_SETTINGS, ...presetDefaults } : { ...DEFAULT_SETTINGS };
    const empty: GraphData = { nodes: [], edges: [], groups: [], settings: presetSettings };
    await writeGraphData(fileName, empty);
    graph.nodes = []; graph.edges = []; graph.groups = [];
    graph.settings = { ...DEFAULT_SETTINGS };
    openTabs.push(fileName);
    activeTab = fileName;
    await loadGraphData(fileName);
    renderAllTabs();
    persistTabs();
  }

  // ===== 状态变量 =====
  let graph: GraphData = { nodes: [], edges: [], groups: [] };
  let linkDist = DEFAULT_SETTINGS.linkDist, labelSize = DEFAULT_SETTINGS.labelSize,
      charge = DEFAULT_SETTINGS.charge, linkStr = DEFAULT_SETTINGS.linkStr,
      collideR = DEFAULT_SETTINGS.collideR, centerS = DEFAULT_SETTINGS.centerS,
      groupBound = DEFAULT_SETTINGS.groupBound, heatingTime = DEFAULT_SETTINGS.heatingTime,
      alphaTarget = DEFAULT_SETTINGS.alphaTarget, editPanelOpacity = DEFAULT_SETTINGS.editPanelOpacity,
      useRAFL = DEFAULT_SETTINGS.useRAFL, nodeExpand = DEFAULT_SETTINGS.nodeExpand,
      lineExpand = DEFAULT_SETTINGS.lineExpand, showGLabels = DEFAULT_SETTINGS.showGLabels,
      glMin = DEFAULT_SETTINGS.glMin, glMax = DEFAULT_SETTINGS.glMax,
      gridVis = DEFAULT_SETTINGS.gridVis, axisVis = DEFAULT_SETTINGS.axisVis,
      axisTicks = DEFAULT_SETTINGS.axisTicks, gridSp = DEFAULT_SETTINGS.gridSp,
      gridWidth = DEFAULT_SETTINGS.gridWidth,
      ar = DEFAULT_SETTINGS.ar, graphTheme = DEFAULT_SETTINGS.graphTheme,
      focusMode = DEFAULT_SETTINGS.focusMode, fluidAppearance = DEFAULT_SETTINGS.fluidAppearance, glowAppearance = DEFAULT_SETTINGS.glowAppearance, gravityGrid = DEFAULT_SETTINGS.gravityGrid, categoryLayout = DEFAULT_SETTINGS.categoryLayout;

  let gw = 800, gh = 600;
  // transform 和 zoom 由 pixi-viewport 管理
  const getViewportTransform = () => {
    if (!pixi) return { k: 1, x: 0, y: 0 };
    const vp = pixi.viewport;
    return { k: vp.scale.x, x: vp.x, y: vp.y };
  };
  const updateGwGh = () => {
    if (pixi) { gw = pixi.viewport.worldWidth; gh = pixi.viewport.worldHeight; }
  };
  let search = '', sField: "name"|"tags"|"note" = "name",
      sDisplayMode: "highlight"|"show" = "highlight",
      sMatchMode: "contains"|"startsWith"|"endsWith"|"fuzzy" = "contains";
  let selNode: string | null = null, selEdge: number | null = null, selGroup: string | null = null;
  let draggingNode: any = null, wasDragged = false;
  let linkMode = false, linkSrc: string | null = null;
  let defArrow = false;
  let linkCursorX = 0, linkCursorY = 0;

  // --- Undo/Redo ---
  const undoManager = new UndoManager();
  const saveUndo = () => undoManager.pushSnapshot(graph);
  const withUndo = <T extends (...args: any[]) => any>(fn: T): ReturnType<T> => {
    saveUndo();
    return fn();
  };

  // --- 存储辅助函数 ---
  const collectSettings = (): GraphSettings => ({
    linkDist, labelSize, charge, linkStr, collideR, centerS, groupBound,
    heatingTime, alphaTarget, editPanelOpacity, useRAFL,
    nodeExpand, lineExpand, showGLabels, glMin, glMax,
    gridVis, axisVis, axisTicks, gridSp, gridWidth, gravityGrid, ar, graphTheme, focusMode, fluidAppearance, glowAppearance, categoryLayout,
  });

  let saveTimeout: any;
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const dirtyTabs = new Set<string>();
  let currentAnimationCancel: (() => void) | null = null; // 当前布局动画的取消函数
  const scheduleSave = () => {
    clearTimeout(saveTimeout);
    dirtyTabs.add(activeTab);
    saveTimeout = setTimeout(async () => {
      graph.settings = collectSettings();
      await writeGraphData(activeTab, graph);
      dirtyTabs.delete(activeTab);
      renderAllTabs();
    }, 300);
  };
  (window as any).__triggerSave = () => scheduleSave();
  (window as any).__graphNodes = graph.nodes;

  const saveNow = async () => {
    graph.settings = collectSettings();
    await writeGraphData(activeTab, graph);
    dirtyTabs.delete(activeTab);
    renderAllTabs();
  };

  const renderAllTabs = () => renderTabs(openTabs, activeTab, dirtyTabs);

  const isFixedNode = (id: string) => { const n = graph.nodes.find(gn => gn.id === id); return n?.fixed || false; };
  const fixNode = (id: string) => {
    const n = graph.nodes.find(gn => gn.id === id);
    if (n) { n.fixed = true; n.fx = n.x; n.fy = n.y; scheduleSave(); }
    // 同步到模拟副本（否则样式不会变）
    const sim = getSim();
    if (sim) { const sn = sim.nodes().find((sn: any) => sn.id === id); if (sn) { sn.fixed = true; sn.fx = sn.x; sn.fy = sn.y; } }
    draw();
  };
  const fixNodes = (ids: string[]) => { for (const id of ids) fixNode(id); draw(); };
  const unfixNodes = (ids: string[]) => {
    const sim = getSim();
    for (const id of ids) {
      const n = graph.nodes.find(gn => gn.id === id);
      if (n) { n.fixed = false; n.fx = null; n.fy = null; }
      if (sim) { const sn = sim.nodes().find((sn: any) => sn.id === id); if (sn) { sn.fixed = false; sn.fx = null; sn.fy = null; } }
    }
    scheduleSave(); draw();
  };

  // --- 模拟管理器 ---
  const simManager = createSimManager(
    graph, () => gw, () => gh,
    () => linkDist, () => linkStr, () => charge, () => centerS,
    () => collideR, () => groupBound,
    () => alphaTarget, () => heatingTime,
    () => fluidAppearance,
    () => draw()
  );
  const getSim = () => simManager.getSim();

  // --- PixiJS 渲染 ---
  const nodeSprites = new Map<string, NodeSprite>();

  const themeLabelColor = () => {
    const t = getTheme(graphTheme);
    return parseInt(t.labelColor.replace('#', ''), 16);
  };
  const themeNodeColor = () => {
    const t = getTheme(graphTheme);
    return parseInt(t.nodeDefaultColor.replace('#', ''), 16);
  };

  const pixiDraw = () => {
    if (!pixi) return;
    const sim = getSim();
    if (!sim) return;
    const nodes = sim.nodes() || [];

    // 空状态提示
    if (nodes.length === 0 && readyToDraw) {
      if (!(pixi.nodeLayer as any)._emptyText) {
        const { Text } = require('pixi.js');
        const emptyText = new Text({
          text: '画布为空\n右键或点击"新建节点"开始',
          resolution: 3,
          style: { fontSize: 16, fill: 0x888888, fontFamily: 'system-ui, sans-serif', align: 'center', lineHeight: 24 } as any,
        });
        emptyText.anchor.set(0.5);
        emptyText.position.set(0, 0);
        (pixi.nodeLayer as any)._emptyText = emptyText;
        pixi.nodeLayer.addChild(emptyText);
      }
      (pixi.nodeLayer as any)._emptyText.visible = true;
    } else if ((pixi.nodeLayer as any)._emptyText) {
      (pixi.nodeLayer as any)._emptyText.visible = false;
    }
    const theme = getTheme(graphTheme);
    const lblColor = parseInt(theme.labelColor.replace('#', ''), 16);
    const defColor = parseInt(theme.nodeDefaultColor.replace('#', ''), 16);

    // 搜索匹配集
    const matchText = (haystack: string, needle: string): boolean => {
      switch (sMatchMode) {
        case 'startsWith': return haystack.toLowerCase().startsWith(needle.toLowerCase());
        case 'endsWith': return haystack.toLowerCase().endsWith(needle.toLowerCase());
        case 'fuzzy': {
          let ni = 0;
          const hl = haystack.toLowerCase(), nl = needle.toLowerCase();
          for (let i = 0; i < hl.length && ni < nl.length; i++) {
            if (hl[i] === nl[ni]) ni++;
          }
          return ni === nl.length;
        }
        case 'contains':
        default: return haystack.toLowerCase().includes(needle.toLowerCase());
      }
    };
    const searchMatchIds = new Set<string>();
    const showOnlyMode = sDisplayMode === 'show' && search;
    if (search) {
      for (const n of nodes) {
        let m = false;
        if (sField === 'name') m = matchText(n.label || '', search);
        else if (sField === 'tags') m = (n.tags || []).some((t: string) => matchText(t, search));
        else if (sField === 'note') m = matchText(n.note || '', search);
        if (m) searchMatchIds.add(n.id);
      }
    }

    // 框选集
    const boxSelIds = new Set(sharedState.selectedNodeIds);

    // 聚焦邻居集
    const focusNeighborIds = new Set<string>();
    let focusActive = false;
    if (sharedState.focusMode && sharedState.hoverNodeId) {
      focusActive = true;
      focusNeighborIds.add(sharedState.hoverNodeId);
      graph.edges.forEach(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        if (src === sharedState.hoverNodeId) focusNeighborIds.add(tgt);
        if (tgt === sharedState.hoverNodeId) focusNeighborIds.add(src);
      });
    }

    // --- 光晕/流体模糊层 ---
    const showBlobs = fluidAppearance || glowAppearance;
    if (showBlobs) {
      updateBlobFilters();
      pixi.blobLayer.visible = true;
      pixi.blobLayer.removeChildren();
      const bg = new Graphics();
      const rMul = fluidAppearance ? 2.5 : 1.8;
      for (const n of nodes) {
        const r = (n.radius || 9) * rMul;
        const colorStr = (n.color && n.color !== '#000000') ? n.color : theme.nodeDefaultColor;
        const color = parseInt(colorStr.replace('#', ''), 16);
        bg.circle(n.x, n.y, r).fill({ color, alpha: 0.5 });
      }
      pixi.blobLayer.addChild(bg);
    } else {
      pixi.blobLayer.visible = false;
    }

    // --- 节点 ---
    for (const n of nodes) {
      const id = n.id;
      let sprite = nodeSprites.get(id);
      if (!sprite) {
        const colorStr = (n.color && n.color !== '#000000') ? n.color : theme.nodeDefaultColor;
        const color = parseInt(colorStr.replace('#', ''), 16);
        sprite = createNodeSprite(id, n.label || id, n.x, n.y, n.radius || 9, color, lblColor, labelSize);
        pixi.nodeLayer.addChild(sprite.container);
        nodeSprites.set(id, sprite);
      } else {
        updateNodePosition(sprite, n.x, n.y);
      }

      // 标签在缩放 0.3-0.45 区间淡入淡出
      sprite.radius = n.radius || 9;
	      const zoom = pixi.viewport.scale.x;
      const labelAlpha = Math.max(0, Math.min(1, (zoom - 0.3) / 0.15));
      sprite.label.visible = labelAlpha > 0;
      sprite.label.alpha = labelAlpha;

      // 组颜色
      const tags: string[] = n.tags || [];
      const matchingGroups = (graph.groups || []).filter((g: any) => g.displayMode !== 'none' && g.nodeColorMode && g.nodeColorMode !== 'off' && tags.includes(g.label));
      let gColor: number | undefined;
      let gEdgeOnly = false;
      if (matchingGroups.length === 1) {
        const gc = matchingGroups[0].nodeColor || matchingGroups[0].color;
        gColor = parseInt((gc || '#5B8FF9').replace('#', ''), 16);
        gEdgeOnly = matchingGroups[0].nodeColorMode === 'edge';
      }

      const colorStr = (n.color && n.color !== '#000000') ? n.color : theme.nodeDefaultColor;
      const baseColor = parseInt(colorStr.replace('#', ''), 16);

      // 冲突节点饼状颜色
      const pieStrColors: string[] | undefined = (n as any)._pieColors;
      const pieColors: number[] | undefined = pieStrColors?.map(c => parseInt(c.replace('#', ''), 16));

      applyNodeVisual(sprite, baseColor, lblColor, labelSize, {
        selected: n.id === selNode,
        boxSelected: boxSelIds.has(id),
        searchMatch: searchMatchIds.has(id),
        fixed: n.fixed || false,
        collapsed: false,
        inFocus: (!focusActive || focusNeighborIds.has(id)) && (!showOnlyMode || searchMatchIds.has(id)),
        groupColor: gColor,
        groupEdgeOnly: gEdgeOnly,
        fluidMode: fluidAppearance,
        pieColors,
        mediaType: n.mediaType || undefined,
        mediaExpanded: isExpanded(n.id),
      });
    }

    // 移除不存在的节点
    const aliveIds = new Set(nodes.map((n: any) => n.id));
    for (const [id, sprite] of nodeSprites) {
      if (!aliveIds.has(id)) {
        pixi.nodeLayer.removeChild(sprite.container);
        nodeSprites.delete(id);
      }
    }

    // 边、集合、网格
    const hiddenNodes = new Set<string>();
    if (showOnlyMode) {
      for (const n of nodes) { if (!searchMatchIds.has(n.id)) hiddenNodes.add(n.id); }
    }
    updateEdges(pixi.edgeLayer, graph, nodes, {
      hiddenNodes,
      focusNeighborIds: focusActive ? focusNeighborIds : undefined,
    });
    // 连线模式：从源节点到光标的虚线
    if (linkMode && linkSrc) {
      const srcNode = nodes.find((n: any) => n.id === linkSrc);
      if (srcNode && (linkCursorX !== 0 || linkCursorY !== 0)) {
        if (!(pixi.edgeLayer as any)._linkGfx) {
          (pixi.edgeLayer as any)._linkGfx = new Graphics();
        }
        const lg = (pixi.edgeLayer as any)._linkGfx as Graphics;
        // 每帧重新加入（updateEdges 调用了 removeChildren）
        pixi.edgeLayer.addChild(lg);
        lg.clear();
        const dashLen = 6, gapLen = 4;
        const dx = linkCursorX - srcNode.x, dy = linkCursorY - srcNode.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
          const ux = dx / len, uy = dy / len;
          let drawn = 0; let on = true;
          while (drawn < len) {
            const seg = on ? Math.min(dashLen, len - drawn) : Math.min(gapLen, len - drawn);
            const sx = srcNode.x + ux * drawn;
            const sy = srcNode.y + uy * drawn;
            drawn += seg;
            const ex = srcNode.x + ux * drawn;
            const ey = srcNode.y + uy * drawn;
            if (on) lg.moveTo(sx, sy).lineTo(ex, ey);
            on = !on;
          }
          lg.stroke({ color: '#5B8FF9', width: 2, alpha: 0.7 });
        }
      }
    } else if ((pixi.edgeLayer as any)._linkGfx) {
      (pixi.edgeLayer as any)._linkGfx.clear();
    }
    // 分类布局矩形框
    if ((activeMode === 'category' || activeMode === 'fullcat') && (graph as any)._categoryBoxes) {
      const boxes = (graph as any)._categoryBoxes;
      if (!(pixi.groupLayer as any)._catGfx) {
        (pixi.groupLayer as any)._catGfx = new Graphics();
        pixi.groupLayer.addChild((pixi.groupLayer as any)._catGfx);
      }
      const cg = (pixi.groupLayer as any)._catGfx as Graphics;
      cg.clear();
      for (const b of boxes) {
        cg.rect(b.x, b.y, b.w, b.h)
          .fill({ color: parseInt(b.color.replace('#', ''), 16), alpha: 0.08 })
          .stroke({ color: parseInt(b.color.replace('#', ''), 16), width: 2, alpha: 0.4 });
        // 标签
        if (!cg.parent) pixi.groupLayer.addChild(cg);
      }
    } else {
      const cg = (pixi.groupLayer as any)._catGfx;
      if (cg) { cg.clear(); pixi.groupLayer.removeChild(cg); (pixi.groupLayer as any)._catGfx = null; }
      updateGroups(pixi.groupLayer, graph, nodes, showGLabels, glMin, glMax);
    }
    // 多媒体覆盖层：跟随节点 + 缩放
    for (const n of nodes) {
      if (n.mediaType && isExpanded(n.id)) {
        const vp = pixi.viewport;
        const scale = vp.scale.x;
        const sp = vp.toScreen(n.x, n.y);
        const rect = pixi.app.canvas.getBoundingClientRect();
        positionMedia(n.id, () => ({ x: rect.left + sp.x, y: rect.top + sp.y }));
        const ov = document.querySelector(`[data-media-id="${n.id}"]`) as HTMLElement;
        if (ov) ov.style.transform = `scale(${scale})`;
      }
    }
    updateGwGh();
    // 网格用 canvas 实际 CSS 尺寸
    const cw = pixi.app.canvas.clientWidth;
    const ch = pixi.app.canvas.clientHeight;
    updateGrid(pixi.gridLayer, cw, ch, {
      gridVis, axisVis, axisTicks, gridSp, gridWidth, gravityGrid,
      nodes,
      transform: getViewportTransform(),
    });
    const selCount = sharedState.selectedNodeIds.length;
    const parts = [`${graph.nodes.length} 节点 | ${graph.edges.length} 连线`];
    if (search) parts.push(`匹配: ${searchMatchIds.size}`);
    if (selCount > 0) parts.push(`选中: ${selCount}`);
    if (sharedState.focusMode) parts.push('聚焦');
    if (linkMode) parts.push('连线中');
    parts.push(`${pixi.viewport.scale.x.toFixed(1)}x`);
    statsEl.textContent = parts.join(' | ');
    searchStatus.style.display = (search && searchMatchIds.size === 0) ? '' : 'none';
    if (search && searchMatchIds.size === 0) searchStatus.textContent = '无结果';
  };

  sharedState.directDraw = () => pixiDraw();
  let drawPending = false;
  const rafDraw = () => { if (!drawPending) { drawPending = true; requestAnimationFrame(() => { drawPending = false; pixiDraw(); }); } };
  const draw = () => { if (useRAFL) rafDraw(); else pixiDraw(); };

  // --- 编辑面板 ---
  const updateInfoRef = { current: () => {} };
  const updateSelectsRef = { current: () => {} };
  const editCtx = createEditPanel(appShell, {
    graph,
    getSelNode: () => selNode, setSelNode: v => { selNode = v; },
    getSelEdge: () => selEdge, setSelEdge: v => { selEdge = v; },
    getSelGroup: () => selGroup, setSelGroup: v => { selGroup = v; },
    getLinkMode: () => linkMode, setLinkMode: v => { linkMode = v; },
    setLinkSrc: v => { linkSrc = v; },
    getSaveData: () => saveNow,
    getInitSim: () => simManager.initSim,
    getUpdateInfo: () => updateInfoRef.current,
    getUpdateSelects: () => updateSelectsRef.current,
    draw,
    triggerSave: () => scheduleSave(),
    getSimulation: getSim,
  }, () => editPanelOpacity);
  const { fillNode, fillEdge, fillGroup, clearEd, updateOpacity } = editCtx;

  // --- 设置面板 ---
  const settingsUI = buildSettings(setDiv, {
    getLinkDist: () => linkDist, setLinkDist: v => { linkDist = v; },
    getLabelSize: () => labelSize, setLabelSize: v => { labelSize = v; },
    getCharge: () => charge, setCharge: v => { charge = v; },
    getLinkStr: () => linkStr, setLinkStr: v => { linkStr = v; },
    getCollideR: () => collideR, setCollideR: v => { collideR = v; },
    getCenterS: () => centerS, setCenterS: v => { centerS = v; },
    getGroupBound: () => groupBound, setGroupBound: v => { groupBound = v; },
    getHeatingTime: () => heatingTime, setHeatingTime: v => { heatingTime = v; },
    getAlphaTarget: () => alphaTarget, setAlphaTarget: v => { alphaTarget = v; },
    getEditPanelOpacity: () => editPanelOpacity, setEditPanelOpacity: v => { editPanelOpacity = v; updateOpacity(v); },
    getUseRAFL: () => useRAFL, setUseRAFL: v => { useRAFL = v; },
    getNodeExpand: () => nodeExpand, setNodeExpand: v => { nodeExpand = v; },
    getLineExpand: () => lineExpand, setLineExpand: v => { lineExpand = v; },
    getShowGLabels: () => showGLabels, setShowGLabels: v => { showGLabels = v; },
    getGlMin: () => glMin, setGlMin: v => { glMin = v; },
    getGlMax: () => glMax, setGlMax: v => { glMax = v; },
    getGridVis: () => gridVis, setGridVis: v => { gridVis = v; },
    getAxisVis: () => axisVis, setAxisVis: v => { axisVis = v; },
    getAxisTicks: () => axisTicks, setAxisTicks: v => { axisTicks = v; },
    getGridSp: () => gridSp, setGridSp: v => { gridSp = v; },
    getAr: () => ar, setAr: v => { ar = v; if (pixi) { pixi.app.renderer.resize(pixi.app.canvas.width, Math.max(300, pixi.app.canvas.width * ar)); updateGwGh(); simManager.updateCenter(); draw(); } },
    getSimulation: getSim, getGw: () => gw, getGh: () => gh,
    draw, getInitSim: () => simManager.initSim, getSaveData: () => saveNow, graph,
    getGraphTheme: () => graphTheme,
    setGraphTheme: v => { graphTheme = v; applyTheme(getTheme(v)); saveNow(); draw(); },
    getDefaultValues: () => {
      const preset = presetDefaults as Record<string, number | boolean | string>;
      return {
        defaultLinkDistance: (preset.linkDist as number) ?? DEFAULT_SETTINGS.linkDist,
        defaultFontSize: (preset.labelSize as number) ?? DEFAULT_SETTINGS.labelSize,
        defaultCharge: (preset.charge as number) ?? DEFAULT_SETTINGS.charge,
        defaultLinkStrength: (preset.linkStr as number) ?? DEFAULT_SETTINGS.linkStr,
        defaultCollideRadius: (preset.collideR as number) ?? DEFAULT_SETTINGS.collideR,
        defaultCenterStrength: (preset.centerS as number) ?? DEFAULT_SETTINGS.centerS,
        defaultGroupBound: (preset.groupBound as number) ?? DEFAULT_SETTINGS.groupBound,
        defaultHeatingTime: (preset.heatingTime as number) ?? DEFAULT_SETTINGS.heatingTime,
        defaultAlphaTarget: (preset.alphaTarget as number) ?? DEFAULT_SETTINGS.alphaTarget,
        defaultEditPanelOpacity: (preset.editPanelOpacity as number) ?? DEFAULT_SETTINGS.editPanelOpacity,
        defaultUseRAFL: (preset.useRAFL as boolean) ?? DEFAULT_SETTINGS.useRAFL,
        defaultFocusMode: (preset.focusMode as boolean) ?? DEFAULT_SETTINGS.focusMode,
        defaultFluidAppearance: (preset.fluidAppearance as boolean) ?? DEFAULT_SETTINGS.fluidAppearance,
        defaultGlowAppearance: (preset.glowAppearance as boolean) ?? DEFAULT_SETTINGS.glowAppearance,
        defaultGravityGrid: (preset.gravityGrid as boolean) ?? DEFAULT_SETTINGS.gravityGrid,
        defaultGridWidth: (preset.gridWidth as number) ?? DEFAULT_SETTINGS.gridWidth,
        defaultNodeExpand: (preset.nodeExpand as number) ?? DEFAULT_SETTINGS.nodeExpand,
        defaultLineExpand: (preset.lineExpand as number) ?? DEFAULT_SETTINGS.lineExpand,
        defaultShowGLabels: (preset.showGLabels as boolean) ?? DEFAULT_SETTINGS.showGLabels,
        defaultGlMin: (preset.glMin as number) ?? DEFAULT_SETTINGS.glMin,
        defaultGlMax: (preset.glMax as number) ?? DEFAULT_SETTINGS.glMax,
        defaultGridVis: (preset.gridVis as boolean) ?? DEFAULT_SETTINGS.gridVis,
        defaultAxisVis: (preset.axisVis as boolean) ?? DEFAULT_SETTINGS.axisVis,
        defaultAxisTicks: (preset.axisTicks as boolean) ?? DEFAULT_SETTINGS.axisTicks,
        defaultGridSpacing: (preset.gridSp as number) ?? DEFAULT_SETTINGS.gridSp,
        defaultAr: (preset.ar as number) ?? DEFAULT_SETTINGS.ar,
        defaultGraphTheme: (preset.graphTheme as string) ?? DEFAULT_SETTINGS.graphTheme,
      };
    },
    getFocusMode: () => focusMode, setFocusMode: v => { focusMode = v; },
    getFluidAppearance: () => fluidAppearance, setFluidAppearance: v => { fluidAppearance = v; draw(); },
    getGlowAppearance: () => glowAppearance, setGlowAppearance: v => { glowAppearance = v; draw(); },
    getGravityGrid: () => gravityGrid, setGravityGrid: v => { gravityGrid = v; draw(); },
    getGridWidth: () => gridWidth, setGridWidth: v => { gridWidth = v; },
  });
  // 图区设置保留在底部（滑块/复选框直接修改当前图）

  // 设置面板 + 预设
  const SETTING_PRESETS_KEY = `fg-setting-presets`;
  let settingPresets: { name: string; values: Partial<GraphSettings> }[] = [];
  try { settingPresets = JSON.parse(localStorage.getItem(SETTING_PRESETS_KEY) || '[]'); } catch {}
  const saveSettingPresets = () => localStorage.setItem(SETTING_PRESETS_KEY, JSON.stringify(settingPresets));

  const getAllSettingValues = (): Partial<GraphSettings> => ({
    linkDist, labelSize, charge, linkStr, collideR, centerS, groupBound,
    heatingTime, alphaTarget, editPanelOpacity, useRAFL, nodeExpand, lineExpand,
    showGLabels, glMin, glMax, gridVis, axisVis, axisTicks, gridSp, gridWidth,
    ar, graphTheme, focusMode, fluidAppearance, glowAppearance, gravityGrid,
  });

  const applySettingValues = (vals: Partial<GraphSettings>) => {
    for (const [k, v] of Object.entries(vals)) {
      if (k === 'linkDist') linkDist = v as number;
      else if (k === 'labelSize') labelSize = v as number;
      else if (k === 'charge') charge = v as number;
      else if (k === 'linkStr') linkStr = v as number;
      else if (k === 'collideR') collideR = v as number;
      else if (k === 'centerS') centerS = v as number;
      else if (k === 'groupBound') groupBound = v as number;
      else if (k === 'heatingTime') heatingTime = v as number;
      else if (k === 'alphaTarget') alphaTarget = v as number;
      else if (k === 'editPanelOpacity') { editPanelOpacity = v as number; updateOpacity(editPanelOpacity); }
      else if (k === 'useRAFL') useRAFL = v as boolean;
      else if (k === 'nodeExpand') nodeExpand = v as number;
      else if (k === 'lineExpand') lineExpand = v as number;
      else if (k === 'showGLabels') showGLabels = v as boolean;
      else if (k === 'glMin') glMin = v as number;
      else if (k === 'glMax') glMax = v as number;
      else if (k === 'gridVis') gridVis = v as boolean;
      else if (k === 'axisVis') axisVis = v as boolean;
      else if (k === 'axisTicks') axisTicks = v as boolean;
      else if (k === 'gridSp') gridSp = v as number;
      else if (k === 'gridWidth') gridWidth = v as number;
      else if (k === 'ar') ar = v as number;
      else if (k === 'graphTheme') { graphTheme = v as string; applyTheme(getTheme(graphTheme)); }
      else if (k === 'focusMode') focusMode = v as boolean;
      else if (k === 'fluidAppearance') fluidAppearance = v as boolean;
      else if (k === 'glowAppearance') glowAppearance = v as boolean;
      else if (k === 'gravityGrid') gravityGrid = v as boolean;
    }
  };

  // 默认预设（新建图和"恢复默认"时采用）
  const PRESET_DEFAULT_KEY = 'fg-preset-default';
  let presetDefaults: Partial<GraphSettings> = {};
  try { presetDefaults = JSON.parse(localStorage.getItem(PRESET_DEFAULT_KEY) || '{}'); } catch {}

  // 预设编辑面板（独立于图区设置，读写 presetDefaults）
  const presetSetDiv = document.createElement('div');
  presetSetDiv.style.cssText = 'padding:4px 0;';
  const presetSettingsUI = buildSettings(presetSetDiv, {
    getLinkDist: () => (presetDefaults.linkDist as number) ?? DEFAULT_SETTINGS.linkDist,
    setLinkDist: v => { presetDefaults.linkDist = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getLabelSize: () => (presetDefaults.labelSize as number) ?? DEFAULT_SETTINGS.labelSize,
    setLabelSize: v => { presetDefaults.labelSize = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getCharge: () => (presetDefaults.charge as number) ?? DEFAULT_SETTINGS.charge,
    setCharge: v => { presetDefaults.charge = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getLinkStr: () => (presetDefaults.linkStr as number) ?? DEFAULT_SETTINGS.linkStr,
    setLinkStr: v => { presetDefaults.linkStr = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getCollideR: () => (presetDefaults.collideR as number) ?? DEFAULT_SETTINGS.collideR,
    setCollideR: v => { presetDefaults.collideR = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getCenterS: () => (presetDefaults.centerS as number) ?? DEFAULT_SETTINGS.centerS,
    setCenterS: v => { presetDefaults.centerS = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGroupBound: () => (presetDefaults.groupBound as number) ?? DEFAULT_SETTINGS.groupBound,
    setGroupBound: v => { presetDefaults.groupBound = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getHeatingTime: () => (presetDefaults.heatingTime as number) ?? DEFAULT_SETTINGS.heatingTime,
    setHeatingTime: v => { presetDefaults.heatingTime = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getAlphaTarget: () => (presetDefaults.alphaTarget as number) ?? DEFAULT_SETTINGS.alphaTarget,
    setAlphaTarget: v => { presetDefaults.alphaTarget = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getEditPanelOpacity: () => (presetDefaults.editPanelOpacity as number) ?? DEFAULT_SETTINGS.editPanelOpacity,
    setEditPanelOpacity: v => { presetDefaults.editPanelOpacity = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getUseRAFL: () => (presetDefaults.useRAFL as boolean) ?? DEFAULT_SETTINGS.useRAFL,
    setUseRAFL: v => { presetDefaults.useRAFL = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getNodeExpand: () => (presetDefaults.nodeExpand as number) ?? DEFAULT_SETTINGS.nodeExpand,
    setNodeExpand: v => { presetDefaults.nodeExpand = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getLineExpand: () => (presetDefaults.lineExpand as number) ?? DEFAULT_SETTINGS.lineExpand,
    setLineExpand: v => { presetDefaults.lineExpand = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getShowGLabels: () => (presetDefaults.showGLabels as boolean) ?? DEFAULT_SETTINGS.showGLabels,
    setShowGLabels: v => { presetDefaults.showGLabels = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGlMin: () => (presetDefaults.glMin as number) ?? DEFAULT_SETTINGS.glMin,
    setGlMin: v => { presetDefaults.glMin = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGlMax: () => (presetDefaults.glMax as number) ?? DEFAULT_SETTINGS.glMax,
    setGlMax: v => { presetDefaults.glMax = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGridVis: () => (presetDefaults.gridVis as boolean) ?? DEFAULT_SETTINGS.gridVis,
    setGridVis: v => { presetDefaults.gridVis = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getAxisVis: () => (presetDefaults.axisVis as boolean) ?? DEFAULT_SETTINGS.axisVis,
    setAxisVis: v => { presetDefaults.axisVis = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getAxisTicks: () => (presetDefaults.axisTicks as boolean) ?? DEFAULT_SETTINGS.axisTicks,
    setAxisTicks: v => { presetDefaults.axisTicks = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGridSp: () => (presetDefaults.gridSp as number) ?? DEFAULT_SETTINGS.gridSp,
    setGridSp: v => { presetDefaults.gridSp = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getAr: () => (presetDefaults.ar as number) ?? DEFAULT_SETTINGS.ar,
    setAr: v => { presetDefaults.ar = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getSimulation: getSim, getGw: () => gw, getGh: () => gh,
    draw: () => {}, getInitSim: () => () => {}, getSaveData: () => async () => {},
    graph, setGraphTheme: v => { presetDefaults.graphTheme = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGraphTheme: () => (presetDefaults.graphTheme as string) ?? DEFAULT_SETTINGS.graphTheme,
    getDefaultValues: () => ({
      defaultLinkDistance: DEFAULT_SETTINGS.linkDist,
      defaultFontSize: DEFAULT_SETTINGS.labelSize,
      defaultCharge: DEFAULT_SETTINGS.charge,
      defaultLinkStrength: DEFAULT_SETTINGS.linkStr,
      defaultCollideRadius: DEFAULT_SETTINGS.collideR,
      defaultCenterStrength: DEFAULT_SETTINGS.centerS,
      defaultGroupBound: DEFAULT_SETTINGS.groupBound,
      defaultHeatingTime: DEFAULT_SETTINGS.heatingTime,
      defaultAlphaTarget: DEFAULT_SETTINGS.alphaTarget,
      defaultEditPanelOpacity: DEFAULT_SETTINGS.editPanelOpacity,
      defaultUseRAFL: DEFAULT_SETTINGS.useRAFL,
      defaultFocusMode: DEFAULT_SETTINGS.focusMode,
      defaultFluidAppearance: DEFAULT_SETTINGS.fluidAppearance,
      defaultGlowAppearance: DEFAULT_SETTINGS.glowAppearance,
      defaultGravityGrid: DEFAULT_SETTINGS.gravityGrid,
      defaultGridWidth: DEFAULT_SETTINGS.gridWidth,
      defaultNodeExpand: DEFAULT_SETTINGS.nodeExpand,
      defaultLineExpand: DEFAULT_SETTINGS.lineExpand,
      defaultShowGLabels: DEFAULT_SETTINGS.showGLabels,
      defaultGlMin: DEFAULT_SETTINGS.glMin,
      defaultGlMax: DEFAULT_SETTINGS.glMax,
      defaultGridVis: DEFAULT_SETTINGS.gridVis,
      defaultAxisVis: DEFAULT_SETTINGS.axisVis,
      defaultAxisTicks: DEFAULT_SETTINGS.axisTicks,
      defaultGridSpacing: DEFAULT_SETTINGS.gridSp,
      defaultAr: DEFAULT_SETTINGS.ar,
      defaultGraphTheme: DEFAULT_SETTINGS.graphTheme,
    }),
    getFocusMode: () => (presetDefaults.focusMode as boolean) ?? DEFAULT_SETTINGS.focusMode,
    setFocusMode: v => { presetDefaults.focusMode = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getFluidAppearance: () => (presetDefaults.fluidAppearance as boolean) ?? DEFAULT_SETTINGS.fluidAppearance,
    setFluidAppearance: v => { presetDefaults.fluidAppearance = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGlowAppearance: () => (presetDefaults.glowAppearance as boolean) ?? DEFAULT_SETTINGS.glowAppearance,
    setGlowAppearance: v => { presetDefaults.glowAppearance = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGravityGrid: () => (presetDefaults.gravityGrid as boolean) ?? DEFAULT_SETTINGS.gravityGrid,
    setGravityGrid: v => { presetDefaults.gravityGrid = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
    getGridWidth: () => (presetDefaults.gridWidth as number) ?? DEFAULT_SETTINGS.gridWidth,
    setGridWidth: v => { presetDefaults.gridWidth = v; localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults)); },
  });

  const settingsPanel = createSettingsPanel(document.body, presetSetDiv, {
    onSavePreset: async (name) => {
      const vals = getAllSettingValues();
      if (name === '默认') {
        // 保存为"默认"预设 → 同时更新 presetDefaults
        presetDefaults = vals;
        localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(vals));
      }
      const exists = settingPresets.findIndex(p => p.name === name);
      if (exists >= 0) { if (!await confirmAction(`覆盖 "${name}"？`)) return; settingPresets.splice(exists, 1); }
      settingPresets.push({ name, values: vals });
      saveSettingPresets();
    },
    onLoadPreset: (name) => {
      if (name === '默认') {
        applySettingValues(presetDefaults);
      } else {
        const p = settingPresets.find(p => p.name === name);
        if (p) { applySettingValues(p.values); }
      }
      settingsUI.updateInfo(); scheduleSave(); simManager.initSim(); draw();
    },
    onDeletePreset: (name) => {
      settingPresets = settingPresets.filter(p => p.name !== name);
      saveSettingPresets();
    },
    onResetDefaults: () => {
      // 仅重置预设默认，不影响当前图
      presetDefaults = {
        linkDist: DEFAULT_SETTINGS.linkDist, labelSize: DEFAULT_SETTINGS.labelSize,
        charge: DEFAULT_SETTINGS.charge, linkStr: DEFAULT_SETTINGS.linkStr,
        collideR: DEFAULT_SETTINGS.collideR, centerS: DEFAULT_SETTINGS.centerS,
        groupBound: DEFAULT_SETTINGS.groupBound, heatingTime: DEFAULT_SETTINGS.heatingTime,
        alphaTarget: DEFAULT_SETTINGS.alphaTarget, editPanelOpacity: DEFAULT_SETTINGS.editPanelOpacity,
        useRAFL: DEFAULT_SETTINGS.useRAFL, nodeExpand: DEFAULT_SETTINGS.nodeExpand,
        lineExpand: DEFAULT_SETTINGS.lineExpand, showGLabels: DEFAULT_SETTINGS.showGLabels,
        glMin: DEFAULT_SETTINGS.glMin, glMax: DEFAULT_SETTINGS.glMax,
        gridVis: DEFAULT_SETTINGS.gridVis, axisVis: DEFAULT_SETTINGS.axisVis,
        axisTicks: DEFAULT_SETTINGS.axisTicks, gridSp: DEFAULT_SETTINGS.gridSp,
        gridWidth: DEFAULT_SETTINGS.gridWidth, ar: DEFAULT_SETTINGS.ar,
        graphTheme: DEFAULT_SETTINGS.graphTheme, focusMode: DEFAULT_SETTINGS.focusMode,
        fluidAppearance: false, glowAppearance: false, gravityGrid: false,
      };
      localStorage.setItem(PRESET_DEFAULT_KEY, JSON.stringify(presetDefaults));
      settingsUI.updateInfo(); scheduleSave(); simManager.initSim(); draw();
    },
    getPresets: () => settingPresets,
    onOpenFolder: async () => {
      // 1. Android SAF 原生目录选择器（Obsidian 式）
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.SafPlugin) {
        try {
          const dir = await safPickDirectory();
          if (dir) {
            fileSystemMountPath = dir.name;
            await refreshFileTree();
            showToast(`已打开: ${dir.name}`, 'success');
            return;
          }
        } catch (e: any) {
          showToast('SAF 错误: ' + (e.message || '未知'), 'error');
          return;
        }
        showToast('已取消目录选择', 'warning');
        return;
      }
      // 2. 桌面 Electron
      const ea = (window as any).electronAPI;
      if (ea?.openFolder) {
        const folderPath = await ea.openFolder();
        if (folderPath) {
          ea.configWrite({ folderPath });
          fileSystemMountPath = folderPath;
          await refreshFileTree();
          return;
        }
      }
      // 3. Web File System Access API (showDirectoryPicker)
      try {
        const h = await openFolder();
        if (h) {
          await saveFolderHandle(h);
          fileSystemMountPath = h.name;
          await refreshFileTree();
          return;
        }
      } catch {}
      // 4. 兜底：同步创建 input 并 click
      triggerFileImport();
    },
    getFolderPath: () => fileSystemMountPath || '（未选择）',
    getFileImporter: undefined, // 所有平台统一用 onOpenFolder → 同步 input.click()
    getAutoUpdate: () => localStorage.getItem('fg-auto-update') === 'true',
    onToggleAutoUpdate: (val) => { localStorage.setItem('fg-auto-update', val ? 'true' : 'false'); },
    onCheckUpdate: async () => {
      const info = await checkUpdate();
      if (!info) { showToast('当前已是最新版本', 'success'); return; }
      showUpdateDialog(info, () => {
        const asset = info.assets.find(a => a.name.endsWith('.apk'));
        const dlUrl = asset?.downloadUrl || info.htmlUrl;
        installApk(dlUrl);
      });
    },
    onDownloadInstall: () => {
      downloadReleaseApk();
    },
  });

  updateInfoRef.current = settingsUI.updateInfo;
  updateSelectsRef.current = () => {};

  // --- 搜索事件 ---
  let lastSearchTerm = '';
  let searchMatchIndex = 0;
  fieldSelect.addEventListener('change', () => { sField = fieldSelect.value as any; draw(); });
  matchModeSelect.addEventListener('change', () => { sMatchMode = matchModeSelect.value as any; draw(); });
  modeSelect.addEventListener('change', () => { sDisplayMode = modeSelect.value as any; draw(); });
  searchInput.addEventListener('input', () => {
    search = searchInput.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchMatchIndex = 0; lastSearchTerm = search;
      draw();
    }, 150);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const nodes = getSim()?.nodes() || [];
      const matching = nodes.filter((n: any) => {
        if (!search) return false;
        switch (sField) {
          case 'name': return (n.label || '').toLowerCase().includes(search.toLowerCase());
          case 'tags': return (n.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
          case 'note': return (n.note || '').toLowerCase().includes(search.toLowerCase());
          default: return false;
        }
      });
      if (search !== lastSearchTerm) { searchMatchIndex = 0; lastSearchTerm = search; }
      else { searchMatchIndex = (searchMatchIndex + 1) % (matching.length || 1); }
      if (matching.length > 0 && pixi) {
        const node = matching[searchMatchIndex];
        const cw = pixi.app.canvas.clientWidth;
        const ch = pixi.app.canvas.clientHeight;
        pixi.viewport.animate({ position: { x: cw / 2 - node.x * pixi.viewport.scale.x, y: ch / 2 - node.y * pixi.viewport.scale.y }, time: SEARCH_MOVE_DURATION });
        fillNode(node.id);
      }
    }
  });

  // --- 操作按钮 ---
  const addBtn = document.createElement('button');
  addBtn.textContent = '新建节点'; addBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  addBtn.onclick = () => {
    const center = pixi?.viewport?.center ?? { x: gw / 2, y: gh / 2 };
    const cx = center.x, cy = center.y;
    const newNode = { id: 'n_' + Date.now(), label: '新节点', radius: 12, headingLevel: 6, tags: [], color: '#5B8FF9', x: cx, y: cy };
    saveUndo(); graph.nodes.push(newNode); scheduleSave(); simManager.initSim(); fillNode(newNode.id);
  };
  primaryRow.appendChild(addBtn);
  const linkBtn = document.createElement('button');
  linkBtn.textContent = '连线模式'; linkBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  linkBtn.onclick = () => { linkMode = !linkMode; linkBtn.style.background = linkMode ? '#5B8FF9' : ''; linkBtn.style.color = linkMode ? '#fff' : ''; if (linkMode) { linkSrc = null; showToast('连线模式：点击源节点，再点击目标节点', 'info', 2000); } else { showToast('已退出连线模式', 'info'); } };
  primaryRow.appendChild(linkBtn);
  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '刷新'; refreshBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  refreshBtn.onclick = async () => {
    if (activeMode === 'tree') { applyTreeLayout(); return; }
    if (activeMode === 'category') { applyCategoryLayout(false); return; }
    if (activeMode === 'fullcat') { applyCategoryLayout(true); return; }
    // demo 数据始终从 DEMO_DATA 重新加载（开发调试用）
    if (activeTab === 'demo') {
      const demo = JSON.parse(JSON.stringify(DEMO_DATA));
      graph.nodes = demo.nodes; graph.edges = demo.edges; graph.groups = demo.groups;
      graph.settings = demo.settings || graph.settings;
      await writeGraphData('demo', graph);
    } else {
      const saved = await readGraphData(activeTab);
      if (saved) { graph.nodes = saved.nodes; graph.edges = saved.edges || []; graph.groups = saved.groups || []; }
    }
    simManager.initSim(); draw();
  };
  primaryRow.appendChild(refreshBtn);
  const fitBtn = document.createElement('button');
  fitBtn.textContent = '适配'; fitBtn.title = '适应所有节点到视口 (F)';
  fitBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  fitBtn.onclick = () => fitAllNodes();
  primaryRow.appendChild(fitBtn);

  // 分隔符
  const sep = document.createElement('span');
  sep.style.cssText = `width:1px;height:20px;background:${V('--fg-border-light', 'rgba(255,255,255,0.15)')};margin:0 2px;align-self:center;`;
  primaryRow.appendChild(sep);

  // --- 布局切换时保存/恢复固定节点 ---
  let savedFixedNodes: { id: string; x: number; y: number; fx: number | null; fy: number | null; fixed: boolean }[] = [];
  let savedGroupModes: { id: string; mode: string; nodeColorMode: string; nodeColor: string }[] = [];
  const saveFixedState = () => {
    savedFixedNodes = graph.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, fx: n.fx, fy: n.fy, fixed: n.fixed || false }));
    savedGroupModes = graph.groups.map(g => ({ id: g.id, mode: g.displayMode, nodeColorMode: g.nodeColorMode || 'off', nodeColor: g.nodeColor || g.color || '#5B8FF9' }));
  };
  const restoreFixedState = () => {
    for (const s of savedFixedNodes) {
      const n = graph.nodes.find(n => n.id === s.id);
      if (n) { n.x = s.x; n.y = s.y; n.fx = s.fx; n.fy = s.fy; n.fixed = s.fixed; }
    }
    for (const gs of savedGroupModes) {
      const g = graph.groups.find(g => g.id === gs.id);
      if (g) { g.displayMode = gs.mode as any; g.nodeColorMode = gs.nodeColorMode as any; g.nodeColor = gs.nodeColor; }
    }
  };

  // --- 树形布局 ---
  let treeMode = false;
  const treeBtn = document.createElement('button');
  treeBtn.textContent = '树形'; treeBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  treeBtn.onclick = () => {
    if (categoryMode || fullCatMode) { saveFixedState(); }
    treeMode = !treeMode;
    treeBtn.style.background = treeMode ? '#5B8FF9' : '';
    treeBtn.style.color = treeMode ? '#fff' : '';
    if (fullCatMode) { fullCatBtn.click(); }
    if (categoryMode) { categoryMode = false; catBtn.style.background = ''; catBtn.style.color = ''; (graph as any)._categoryBoxes = null; }
    if (treeMode) {
      saveFixedState();
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      applyTreeLayout();
    }
    else {
      restoreFixedState();
      // 取消树形：缓动回自由力布局
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; (n as any)._sx = n.x; (n as any)._sy = n.y; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      simManager.initSim();
      // 动画混合：900ms 从旧位置插值到模拟位置
      currentAnimationCancel?.();
      currentAnimationCancel = startNodeAnimation({
        nodes: graph.nodes,
        simNodes: simManager.getSim()?.nodes() || [],
        getSource: (n) => ({ x: (n as any)._sx, y: (n as any)._sy }),
        getTarget: (n) => {
          const sim = simManager.getSim()?.nodes() || [];
          const sn = sim.find((s: any) => s.id === n.id);
          return sn ? { x: sn.x, y: sn.y } : null;
        },
        onFrame: () => sharedState.directDraw?.(),
        unfixSimOnComplete: true,
      });
    }
  };
  // (treeBtn removed — now in mode bar)

  // 树形布局逻辑
  const applyTreeLayout = () => {
    const nodes = graph.nodes;
    const edges = graph.edges;
    if (nodes.length === 0) return;
    // 找根：headingLevel=1 或半径最大
    let root = nodes.find((n: any) => n.headingLevel === 1) || nodes.reduce((a: any, b: any) => (b.radius || 9) > (a.radius || 9) ? b : a);
    const rootId = root.id;
    // BFS 建树（所有边都参与遍历，包括虚线）
    const children = new Map<string, string[]>();
    const parent = new Map<string, string>();
    const visited = new Set<string>([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const pid = queue.shift()!;
      if (!children.has(pid)) children.set(pid, []);
      for (const e of edges) {
        const src = typeof e.source === 'object' ? e.source.id : e.source;
        const tgt = typeof e.target === 'object' ? e.target.id : e.target;
        let childId: string | null = null;
        if (src === pid && !visited.has(tgt)) childId = tgt;
        else if (tgt === pid && !visited.has(src)) childId = src;
        if (childId) {
          visited.add(childId);
          parent.set(childId, pid);
          children.get(pid)!.push(childId);
          queue.push(childId);
        }
      }
    }
    // 标记冲突边：只标记不在树中的边，用户自设虚线不算冲突
    for (const e of edges) {
      delete (e as any)._conflict;
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      const isParent = parent.get(src) === tgt || parent.get(tgt) === src;
      if (!isParent) {
        (e as any)._conflict = true;
      }
    }
    // 计算子树的叶节点数（决定宽度）
    const leafCount = new Map<string, number>();
    const calcLeaves = (id: string): number => {
      const kids = children.get(id) || [];
      if (kids.length === 0) { leafCount.set(id, 1); return 1; }
      let sum = 0;
      for (const cid of kids) sum += calcLeaves(cid);
      leafCount.set(id, Math.max(sum, 1));
      return leafCount.get(id)!;
    };
    calcLeaves(rootId);

    const levelY = 100;
    const unitX = 110; // 每个叶节点占据的宽度
    const levels = new Map<string, number>();
    const posX = new Map<string, number>();

    const layoutTree = (id: string, depth: number, leftBound: number) => {
      levels.set(id, depth);
      const kids = children.get(id) || [];
      if (kids.length === 0) {
        posX.set(id, leftBound);
        return;
      }
      // 每个子树居中于其叶节点范围
      let cursor = leftBound;
      const kidPositions: number[] = [];
      for (const cid of kids) {
        const w = leafCount.get(cid) || 1;
        layoutTree(cid, depth + 1, cursor);
        const center = cursor + (w - 1) * unitX / 2;
        kidPositions.push(center);
        cursor += w * unitX;
      }
      // 父节点居中于子节点
      posX.set(id, (kidPositions[0] + kidPositions[kidPositions.length - 1]) / 2);
    };
    layoutTree(rootId, 0, 0);

    // 孤立节点
    let maxLv = 0;
    for (const [id, lv] of levels) { if (lv > maxLv) maxLv = lv; }
    for (const n of nodes) {
      if (!visited.has(n.id)) {
        levels.set(n.id, maxLv + 1);
        posX.set(n.id, (children.get(rootId)?.length || 0) * unitX);
        children.get(rootId)!.push(n.id);
      }
    }
    // 居中整个树：找到最左和最右
    let minX = Infinity, maxX = -Infinity;
    for (const [id, x] of posX) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    const offsetX = -(minX + maxX) / 2;
    // 存储目标位置，由动画逐帧过渡
    for (const n of nodes) {
      (n as any)._treeX = (posX.get(n.id) ?? 0) + offsetX;
      (n as any)._treeY = (levels.get(n.id) ?? 0) * levelY;
    }
    // RAF 动画平滑过渡到目标树位置
    const simNodes = simManager.getSim()?.nodes() || [];
    simManager.getSim()?.stop();
    currentAnimationCancel?.();
    currentAnimationCancel = startNodeAnimation({
      nodes: graph.nodes,
      simNodes,
      getTarget: (n) => {
        const tx = (n as any)._treeX, ty = (n as any)._treeY;
        if (tx == null) return null;
        return { x: tx, y: ty };
      },
      onFrame: () => sharedState.directDraw?.(),
      onComplete: () => simManager.initSim(),
      fixOnComplete: true,
    });
  };

  // --- 逆时针旋转 90°（变换节点坐标）---
  const rotBtn = document.createElement('button');
  rotBtn.textContent = '旋转'; rotBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  rotBtn.onclick = () => {
    // 所有节点绕原点 (0,0) 逆时针旋转 90°：(x,y) → (y, -x)
    for (const n of graph.nodes) {
      const oldX = n.x, oldY = n.y;
      n.x = oldY;
      n.y = -oldX;
      if (n.fx != null) { n.fx = oldY; n.fy = -oldX; }
    }
    scheduleSave();
    if (treeMode) {
      // 树模式：旋转后更新目标位置并重新缓动
      for (const n of graph.nodes) {
        n.fixed = false; n.fx = null; n.fy = null;
        if ((n as any)._treeX != null) {
          const tx = (n as any)._treeX, ty = (n as any)._treeY;
          (n as any)._treeX = ty;
          (n as any)._treeY = -tx;
        }
      }
      // 重新启动缓动到旋转后的目标
      const simNodes = simManager.getSim()?.nodes() || [];
      for (const n of graph.nodes) {
        if ((n as any)._treeX != null) {
          const sn = simNodes.find((s: any) => s.id === n.id);
          (n as any)._sx = sn ? sn.x : n.x;
          (n as any)._sy = sn ? sn.y : n.y;
        }
      }
      simManager.getSim()?.stop();
      currentAnimationCancel?.();
      currentAnimationCancel = startNodeAnimation({
        nodes: graph.nodes,
        simNodes: simManager.getSim()?.nodes() || [],
        getTarget: (n) => {
          const tx = (n as any)._treeX, ty = (n as any)._treeY;
          if (tx == null) return null;
          return { x: tx, y: ty };
        },
        onFrame: () => sharedState.directDraw?.(),
        onComplete: () => simManager.initSim(),
        fixOnComplete: true,
      });
    }
    else { simManager.initSim(); draw(); }
  };
  controlsDiv.appendChild(rotBtn);

  // 导入文件按钮
  const importBtn = document.createElement('button');
  importBtn.textContent = '导入'; importBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  importBtn.onclick = async () => {
    // Electron 模式：原生文件对话框，直接存路径
    const ea = (window as any).electronAPI;
    if (ea?.openFile) {
      const filePath = await ea.openFile();
      if (!filePath) return;
      const name = filePath.split(/[\\/]/).pop() || 'file';
      let mediaType = 'md';
      if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(name)) mediaType = 'image';
      else if (/\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(name)) mediaType = 'audio';
      else if (/\.(mp4|webm|mov|avi|mkv)$/i.test(name)) mediaType = 'video';
      const id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      graph.nodes.push({ id, label: name, radius: 11, headingLevel: 4, tags: [], color: '#5B8FF9',
        x: Math.random() * 200 - 100, y: Math.random() * 200 - 100,
        mediaType, mediaUrl: filePath });
      scheduleSave(); simManager.initSim(); draw();
      return;
    }
    // 浏览器模式：blob URL
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true;
    inp.onchange = () => {
      const files = inp.files;
      if (!files || !pixi) return;
      for (const file of Array.from(files)) {
        let mediaType = 'md';
        if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(file.name)) mediaType = 'image';
        else if (/\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(file.name)) mediaType = 'audio';
        else if (/\.(mp4|webm|mov|avi|mkv)$/i.test(file.name)) mediaType = 'video';
        const id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        graph.nodes.push({ id, label: file.name, radius: 11, headingLevel: 4, tags: [], color: '#5B8FF9',
          x: Math.random() * 200 - 100, y: Math.random() * 200 - 100,
          mediaType, mediaUrl: URL.createObjectURL(file) });
      }
      scheduleSave(); simManager.initSim(); draw();
    };
    inp.click();
  };
  controlsDiv.appendChild(importBtn);

  // --- 分类布局 ---
  let categoryMode = false;
  const catBtn = document.createElement('button');
  catBtn.textContent = '分类'; catBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  catBtn.onclick = () => {
    categoryMode = !categoryMode;
    catBtn.style.background = categoryMode ? '#5B8FF9' : '';
    catBtn.style.color = categoryMode ? '#fff' : '';
    if (categoryMode) {
      saveFixedState();
      if (treeMode) { treeMode = false; treeBtn.style.background = ''; treeBtn.style.color = ''; for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; } }
      if (fullCatMode) { fullCatBtn.click(); }
      pixi!.groupLayer.removeChildren();
      applyCategoryLayout();
    } else {
      restoreFixedState();
      // 缓动退出
      categoryMode = false; // 立即停止渲染框
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; (n as any)._sx = n.x; (n as any)._sy = n.y; }
      (graph as any)._categoryBoxes = null;
      delete (graph as any)._categoryBoxes;
      simManager.initSim();
      currentAnimationCancel?.();
      currentAnimationCancel = startNodeAnimation({
        nodes: graph.nodes,
        simNodes: simManager.getSim()?.nodes() || [],
        getSource: (n) => ({ x: (n as any)._sx, y: (n as any)._sy }),
        getTarget: (n) => {
          const sim = simManager.getSim()?.nodes() || [];
          const sn = sim.find((s: any) => s.id === n.id);
          return sn ? { x: sn.x, y: sn.y } : null;
        },
        onFrame: () => sharedState.directDraw?.(),
        unfixSimOnComplete: true,
      });
    }
  };
  // (catBtn removed — now in mode bar)

  // --- 全分类布局 ---
  let fullCatMode = false;
  const fullCatBtn = document.createElement('button');
  fullCatBtn.textContent = '全分类'; fullCatBtn.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 8px;cursor:pointer;`;
  let fullCatSavedModes: { id: string; mode: string }[] = [];
  fullCatBtn.onclick = () => {
    fullCatMode = !fullCatMode;
    fullCatBtn.style.background = fullCatMode ? '#5B8FF9' : '';
    fullCatBtn.style.color = fullCatMode ? '#fff' : '';
    if (fullCatMode) {
      if (treeMode) { treeMode = false; treeBtn.style.background = ''; treeBtn.style.color = ''; for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; } }
      if (categoryMode) { categoryMode = false; catBtn.style.background = ''; catBtn.style.color = ''; }
      pixi!.groupLayer.removeChildren();
      (graph as any)._categoryBoxes = null;
      // 临时启用所有集合
      fullCatSavedModes = graph.groups.map(g => ({ id: g.id, mode: g.displayMode }));
      for (const g of graph.groups) { if (g.displayMode === 'none') g.displayMode = 'rect'; }
      applyCategoryLayout(true);
    } else {
      // 恢复集合显示状态
      for (const g of graph.groups) {
        const saved = savedGroupModes.find(s => s.id === g.id);
        if (saved) g.displayMode = saved.mode as any;
      }
      categoryMode = false; catBtn.style.background = ''; catBtn.style.color = '';
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; (n as any)._sx = n.x; (n as any)._sy = n.y; }
      (graph as any)._categoryBoxes = null; delete (graph as any)._categoryBoxes;
      simManager.initSim();
      currentAnimationCancel?.();
      currentAnimationCancel = startNodeAnimation({
        nodes: graph.nodes,
        simNodes: simManager.getSim()?.nodes() || [],
        getSource: (n) => ({ x: (n as any)._sx, y: (n as any)._sy }),
        getTarget: (n) => {
          const sim = simManager.getSim()?.nodes() || [];
          const sn = sim.find((s: any) => s.id === n.id);
          return sn ? { x: sn.x, y: sn.y } : null;
        },
        onFrame: () => sharedState.directDraw?.(),
        unfixSimOnComplete: true,
      });
    }
  };
  // (fullCatBtn removed — now in mode bar)

  const applyCategoryLayout = (allGroups = false) => {
    const nodes = graph.nodes;
    const groups = allGroups ? graph.groups : graph.groups.filter(g => g.displayMode !== 'none');
    const groupNodes = new Map<string, any[]>();
    const conflictNodes: any[] = [];
    const noGroupNodes: any[] = [];
    for (const n of nodes) {
      n.fixed = false; n.fx = null; n.fy = null;
      const tags: string[] = n.tags || [];
      const matchGroups = groups.filter(g => tags.includes(g.label));
      if (matchGroups.length === 0) noGroupNodes.push(n);
      else if (matchGroups.length === 1) {
        const gid = matchGroups[0].id;
        if (!groupNodes.has(gid)) groupNodes.set(gid, []);
        groupNodes.get(gid)!.push(n);
      } else conflictNodes.push(n);
    }
    const parts: { label: string; nodes: any[]; color: string }[] = [];
    for (const g of groups) {
      const gn = groupNodes.get(g.id) || [];
      if (gn.length > 0) parts.push({ label: g.label, nodes: gn, color: g.color || '#5B8FF9' });
    }
    if (noGroupNodes.length > 0) parts.push({ label: '无', nodes: noGroupNodes, color: '#888' });
    if (conflictNodes.length > 0) parts.push({ label: '冲突', nodes: conflictNodes, color: '#CC4400' });
    if (parts.length === 0) return;

    // 按节点数决定框大小：每节点 18000px²，最小 260×260
    const unitArea = 18000;
    const innerPad = 55;
    const boxMin = 260;
    const gap = 12; // 框间小间距
    parts.sort((a, b) => {
      if (a.label === '冲突') return 1; if (b.label === '冲突') return -1;
      if (a.label === '无') return 1; if (b.label === '无') return -1;
      return 0;
    });
    // 计算每个框的实际宽高
    const sizes = parts.map(p => {
      const area = Math.max(boxMin * boxMin, p.nodes.length * unitArea);
      return { w: Math.sqrt(area), h: Math.sqrt(area) };
    });
    // 紧排：按行打包，每行高度统一
    const maxRowW = Math.max(...sizes.map(s => s.w)) * parts.length + gap * (parts.length - 1);
    let rowY = 0, rowIdx = 0;
    while (rowIdx < parts.length) {
      // 找出这一行能放下的框
      let rowX = 0, rowH = 0, endIdx = rowIdx;
      for (let i = rowIdx; i < parts.length; i++) {
        const testW = rowX + (rowX > 0 ? gap : 0) + sizes[i].w;
        if (testW > maxRowW && rowIdx !== i) break;
        rowX = testW;
        rowH = Math.max(rowH, sizes[i].h);
        endIdx = i + 1;
      }
      // 布局这一行
      let curX = -rowX / 2;
      for (let i = rowIdx; i < endIdx; i++) {
        const s = sizes[i];
        const bx = curX;
        const by = rowY;
        const bw = s.w, bh = rowH;
        const nCount = parts[i].nodes.length;
        const nCols = Math.ceil(Math.sqrt(nCount * bw / bh));
        const nRows = Math.ceil(nCount / nCols);
        const nx = nCols > 1 ? (bw - innerPad * 2) / (nCols - 1) : 0;
        const ny = nRows > 1 ? (bh - innerPad * 2) / (nRows - 1) : 0;
        parts[i].nodes.forEach((n, ni) => {
          const nc = ni % nCols, nr = Math.floor(ni / nCols);
          (n as any)._treeX = bx + innerPad + nc * nx;
          (n as any)._treeY = by + innerPad + nr * ny;
        });
        (parts[i] as any)._box = { x: bx, y: by, w: bw, h: bh, color: parts[i].color, label: parts[i].label };
        curX += bw + gap;
      }
      rowY += rowH + gap;
      rowIdx = endIdx;
    }
    // 整体居中
    const boxes = parts.map(p => (p as any)._box).filter(Boolean);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of boxes) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
    const offX = -(minX + maxX) / 2, offY = -(minY + maxY) / 2;
    for (const b of boxes) { b.x += offX; b.y += offY; }
    for (const n of graph.nodes) {
      if ((n as any)._treeX != null) { (n as any)._treeX += offX; (n as any)._treeY += offY; }
    }

    // 冲突节点饼状设色
    for (const n of conflictNodes) {
      const tags: string[] = n.tags || [];
      const matchGroups = groups.filter(g => tags.includes(g.label));
      (n as any)._pieColors = matchGroups.map(g => g.color || '#5B8FF9');
    }

    (graph as any)._categoryBoxes = parts.map(p => (p as any)._box).filter(Boolean);
    // 不调用 scheduleSave：布局是临时视图，不应持久化固定状态

    // 缓动进入
    const simNodes = simManager.getSim()?.nodes() || [];
    simManager.getSim()?.stop();
    currentAnimationCancel?.();
    currentAnimationCancel = startNodeAnimation({
      nodes: graph.nodes,
      simNodes,
      getTarget: (n) => {
        const tx = (n as any)._treeX, ty = (n as any)._treeY;
        if (tx == null) return null;
        return { x: tx, y: ty };
      },
      onFrame: () => sharedState.directDraw?.(),
      onComplete: () => simManager.initSim(),
      fixOnComplete: true,
    });
  };

  // --- 集合搜索 ---
  // --- 统一布局模式选择器 ---
  interface SavedLayout { name: string; nodes: { id: string; x: number; y: number; fx: number | null; fy: number | null; fixed: boolean }[]; groupModes: { id: string; mode: string }[]; }
  let layouts: SavedLayout[] = [];
  const loadLayouts = () => {
    try { layouts = JSON.parse(localStorage.getItem(`fg-layouts-${activeTab}`) || '[]'); } catch { layouts = []; }
  };
  const saveLayouts = () => { localStorage.setItem(`fg-layouts-${activeTab}`, JSON.stringify(layouts)); };
  loadLayouts();

  let modeCollapsed = false;
  const modeToggle = document.createElement('span');
  modeToggle.textContent = '布局 ▾'; modeToggle.style.cssText = `font-size:${V('--fg-font-sm', '0.8em')};cursor:pointer;margin-right:4px;`;
  modeToggle.onclick = () => { modeCollapsed = !modeCollapsed; modeToggle.textContent = modeCollapsed ? '布局 ▸' : '布局 ▾'; modeRow.style.display = modeCollapsed ? 'none' : ''; };
  primaryRow.appendChild(modeToggle);

  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:3px;align-items:center;flex-wrap:wrap;';
  primaryRow.appendChild(modeRow);

  let activeMode = 'default'; // default | tree | category | fullcat | layout:xxx
  const exitLayoutMode = (toMode = 'default') => {
    currentAnimationCancel?.();
    if (activeMode === 'tree') {
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; delete (n as any)._pieColors; delete (n as any)._treeX; delete (n as any)._treeY; delete (n as any)._sx; delete (n as any)._sy; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
    } else if (activeMode === 'category' || activeMode === 'fullcat') {
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; delete (n as any)._pieColors; delete (n as any)._treeX; delete (n as any)._treeY; delete (n as any)._sx; delete (n as any)._sy; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      (graph as any)._categoryBoxes = null;
      if (activeMode === 'fullcat') {
        for (const g of graph.groups) {
          const saved = (window as any)._savedGroupModes?.find((s: any) => s.id === g.id);
          if (saved) g.displayMode = saved.mode;
        }
      }
    }
    activeMode = toMode;
    renderModeBar();
    if (toMode === 'default') { saveNow(); simManager.initSim(); draw(); }
  };

  const applyLayoutMode = (mode: string) => {
    currentAnimationCancel?.(); // 取消正在进行的动画
    // 只在离开默认模式时保存一次
    if (activeMode === 'default' && mode !== 'default') saveFixedState();
    // 清理当前模式
    if (activeMode === 'tree') { for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; } for (const e of graph.edges) { delete (e as any)._conflict; } }
    if (activeMode === 'category' || activeMode === 'fullcat') { (graph as any)._categoryBoxes = null;
      for (const n of graph.nodes) { delete (n as any)._pieColors; }
      if (activeMode === 'fullcat') { for (const g of graph.groups) { const saved = (window as any)._savedGroupModes?.find((s: any) => s.id === g.id); if (saved) g.displayMode = saved.mode; } }
    }
    activeMode = mode;
    renderModeBar();
    if (mode === 'default') {
      // 彻底清理所有布局残留
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; delete (n as any)._pieColors; delete (n as any)._treeX; delete (n as any)._treeY; delete (n as any)._sx; delete (n as any)._sy; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      (graph as any)._categoryBoxes = null;
      // 恢复进入布局前的固定节点和集合状态
      restoreFixedState();
      // 清空保存状态（避免下次恢复时用过期数据）
      savedFixedNodes = [];
      savedGroupModes = [];
      // 持久化：把清理后的状态写入 localStorage，刷新后不加载脏数据
      saveNow(); simManager.initSim(); draw();
    } else if (mode === 'tree') {
      for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; }
      for (const e of graph.edges) { delete (e as any)._conflict; }
      applyTreeLayout();
    } else if (mode === 'category') {
      pixi!.groupLayer.removeChildren();
      applyCategoryLayout(false);
    } else if (mode === 'fullcat') {
      (window as any)._savedGroupModes = graph.groups.map(g => ({ id: g.id, mode: g.displayMode }));
      for (const g of graph.groups) { if (g.displayMode === 'none') g.displayMode = 'rect'; }
      pixi!.groupLayer.removeChildren();
      applyCategoryLayout(true);
    } else {
      // 自定义布局
      const l = layouts.find(x => x.name === mode);
      if (l) {
        for (const n of graph.nodes) { n.fixed = false; n.fx = null; n.fy = null; }
        for (const sn of l.nodes) { const n = graph.nodes.find(n => n.id === sn.id); if (n) { n.x = sn.x; n.y = sn.y; n.fx = sn.fx; n.fy = sn.fy; n.fixed = sn.fixed; } }
        for (const gm of l.groupModes) { const g = graph.groups.find(g => g.id === gm.id); if (g) g.displayMode = gm.mode as any; }
        simManager.initSim(); draw();
      }
    }
  };

  const renderModeBar = () => {
    modeRow.innerHTML = '';
    const mkPill = (label: string, mode: string, isActive: boolean) => {
      const pill = document.createElement('span');
      pill.textContent = label;
      pill.style.cssText = `font-size:${V('--fg-font-xs', '0.72em')};padding:1px 8px;cursor:pointer;border-radius:3px;white-space:nowrap;user-select:none;${
        isActive ? `background:rgba(91,143,249,0.35);border:1px solid rgba(91,143,249,0.5);color:${V('--fg-text','#fff')};` : `border:1px solid ${V('--fg-border-light','rgba(255,255,255,0.18)')};`
      }`;
      pill.onclick = () => { if (!isActive) applyLayoutMode(mode); };
      return pill;
    };
    modeRow.appendChild(mkPill('默认', 'default', activeMode === 'default'));
    modeRow.appendChild(mkPill('树形', 'tree', activeMode === 'tree'));
    modeRow.appendChild(mkPill('分类', 'category', activeMode === 'category'));
    modeRow.appendChild(mkPill('全分类', 'fullcat', activeMode === 'fullcat'));
    for (const l of layouts) {
      const active = activeMode === l.name;
      const pill = mkPill(l.name, l.name, active);
      pill.oncontextmenu = (e) => {
        e.preventDefault();
        const menu = document.createElement('div');
        menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:${Z_CONTEXT_MENU};background:${V('--fg-surface-glass','rgba(40,42,48,0.9)')};border:1px solid ${V('--fg-glass-border','rgba(255,255,255,0.15)')};border-radius:6px;padding:4px 0;min-width:90px;font-size:${V('--fg-font-sm', '0.8em')};color:${V('--fg-text','#ccc')};box-shadow:${V('--fg-shadow-md','0 4px 16px rgba(0,0,0,0.3)')};backdrop-filter:blur(10px);`;
        const mk = (t: string, fn: () => void) => {
          const mi = document.createElement('div'); mi.textContent = t;
          mi.style.cssText = 'padding:3px 8px;cursor:pointer;';
          mi.onmouseenter = () => mi.style.background = V('--fg-button-hover','rgba(255,255,255,0.12)');
          mi.onmouseleave = () => mi.style.background = '';
          mi.onclick = () => { fn(); menu.remove(); }; return mi;
        };
        menu.appendChild(mk('重命名', async () => { const nn = await safePrompt('新名称：', l.name); if (nn) { const oldActive = activeMode === l.name; l.name = nn; if (oldActive) activeMode = nn; saveLayouts(); renderModeBar(); } }));
                menu.appendChild(mk('删除', async () => { if (await confirmAction(`删除 "${l.name}"？`)) { if (activeMode === l.name) applyLayoutMode('default'); layouts = layouts.filter(x => x !== l); saveLayouts(); renderModeBar(); } }));
        document.body.appendChild(menu);
        const close = () => { menu.remove(); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 0);
      };
      modeRow.appendChild(pill);
    }
    // + 保存按钮
    const addBtn = document.createElement('span');
    addBtn.textContent = '+'; addBtn.title = '保存为布局';
    addBtn.style.cssText = `font-size:${V('--fg-font-xs', '0.72em')};padding:1px 6px;cursor:pointer;border-radius:3px;border:1px solid ${V('--fg-border-light','rgba(255,255,255,0.18)')};`;
    addBtn.onclick = async () => {
      // 如果在自定义布局模式，直接更新当前布局
      if (activeMode !== 'default' && activeMode !== 'tree' && activeMode !== 'category' && activeMode !== 'fullcat') {
        const l = layouts.find(x => x.name === activeMode);
        if (l) {
          l.nodes = graph.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, fx: n.fx, fy: n.fy, fixed: n.fixed || false }));
          l.groupModes = graph.groups.map(g => ({ id: g.id, mode: g.displayMode }));
          saveLayouts(); renderModeBar(); return;
        }
      }
      const name = await safePrompt('布局名称：');
      if (!name) return;
      const exists = layouts.findIndex(l => l.name === name);
      if (exists >= 0) { if (!await confirmAction(`覆盖 "${name}"？`)) return; layouts.splice(exists, 1); }
      layouts.push({ name,
        nodes: graph.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, fx: n.fx, fy: n.fy, fixed: n.fixed || false })),
        groupModes: graph.groups.map(g => ({ id: g.id, mode: g.displayMode })),
      });
      saveLayouts(); renderModeBar();
    };
    modeRow.appendChild(addBtn);
  };
  renderModeBar();

  // --- 集合搜索 ---
  const groupInput = document.createElement('input');
  groupInput.type = 'text'; groupInput.placeholder = '输入标签搜索/创建集合';
  groupInput.style.cssText = `font-size:${V('--fg-font-md', '0.85em')};padding:2px 6px;border:1px solid ${V('--fg-input-border','#ccc')};border-radius:4px;width:160px;`;
  controlsDiv.appendChild(groupInput);
  const groupDropdown = document.createElement('div');
  groupDropdown.style.cssText = `position:absolute;z-index:${Z_DROPDOWN};background:${V('--fg-surface','#fff')};border:1px solid ${V('--fg-border','#d0d0d0')};border-radius:4px;max-height:150px;overflow-y:auto;display:none;font-size:${V('--fg-font-md', '0.85em')};min-width:160px;`;
  groupInput.parentElement!.style.position = 'relative';
  groupInput.parentElement!.appendChild(groupDropdown);
  groupInput.addEventListener('input', () => {
    const q = groupInput.value.trim().toLowerCase();
    groupDropdown.innerHTML = '';
    if (!q) { groupDropdown.style.display = 'none'; return; }
    const matched = graph.groups.filter(g => g.label.toLowerCase().includes(q));
    if (matched.length > 0) {
      matched.forEach(g => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:4px 8px;cursor:pointer;display:flex;align-items:center;gap:6px;';
        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};flex-shrink:0;`;
        item.appendChild(dot); item.appendChild(document.createTextNode(g.label));
        item.onmousedown = (ev) => { ev.preventDefault(); fillGroup(g.id); groupDropdown.style.display = 'none'; };
        item.onmouseenter = () => item.style.background = V('--fg-button-hover','#e8e8e8');
        item.onmouseleave = () => item.style.background = '';
        groupDropdown.appendChild(item);
      });
    }
    const createItem = document.createElement('div');
    createItem.style.cssText = `padding:4px 8px;cursor:pointer;color:#5B8FF9;font-style:italic;border-top:1px solid ${V('--fg-border-light','#eee')};`;
    createItem.textContent = `+ 创建集合 "${q}"`;
    createItem.onmousedown = (ev) => {
      ev.preventDefault();
      saveUndo();
      const newGroup = { id: 'g_' + Date.now(), label: q, color: '#5B8FF9', borderColor: '#3A6FD8', opacity: 0.15, displayMode: 'rect' as any, nodeColorMode: 'off' as any };
      graph.groups.push(newGroup); scheduleSave(); draw(); fillGroup(newGroup.id);
      groupDropdown.style.display = 'none';
    };
    groupDropdown.appendChild(createItem);
    groupDropdown.style.display = 'block';
  });
  groupInput.addEventListener('focus', () => { if (groupInput.value.trim()) groupInput.dispatchEvent(new Event('input')); });
  groupInput.addEventListener('blur', () => { setTimeout(() => { groupDropdown.style.display = 'none'; }, 150); });

  // --- 缩放/平移由 pixi-viewport 处理 ---

  // --- 右键菜单 ---
  const onContextMenu = (type: 'blank'|'node'|'edge'|'group', id: string | null, screenX: number, screenY: number) => {
    const items: { label: string; action: () => void }[] = [];
    const mx = screenX, my = screenY; // appShell 在 (0,0)，直接用屏幕坐标
    if (type === 'blank') {
      items.push({
        label: '新建节点',
        action: () => {
          const center = pixi?.viewport?.center ?? { x: gw / 2, y: gh / 2 };
          const cx = center.x, cy = center.y;
          saveUndo(); graph.nodes.push({ id: 'n_' + Date.now(), label: '新节点', radius: 12, headingLevel: 6, tags: [], color: '#5B8FF9', x: cx, y: cy });
          scheduleSave(); simManager.initSim();
        },
      });
    } else if (type === 'node' && id) {
      items.push({ label: '编辑', action: () => { fillNode(id); } });
      // 选择邻居
      items.push({ label: '选择邻居', action: () => {
        const neighborIds = new Set<string>();
        graph.edges.forEach(e => {
          const src = typeof e.source === 'object' ? e.source.id : e.source;
          const tgt = typeof e.target === 'object' ? e.target.id : e.target;
          if (src === id) neighborIds.add(tgt);
          if (tgt === id) neighborIds.add(src);
        });
        neighborIds.add(id); // 包含当前节点
        sharedState.setSelectedNodeIds?.([...neighborIds]);
      }});
      // 复制节点
      items.push({ label: '复制节点', action: () => {
        const orig = graph.nodes.find(n => n.id === id);
        if (!orig) return;
        const newId = 'n_' + Date.now();
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = newId; copy.x = (orig.x || 0) + 60; copy.y = (orig.y || 0) + 40;
        delete copy.fx; delete copy.fy; delete copy.fixed;
        saveUndo(); graph.nodes.push(copy);
        scheduleSave(); simManager.initSim(); draw(); fillNode(newId);
      }});
      const node = graph.nodes.find(n => n.id === id);
      if (node?.mediaType && isExpanded(id)) {
        items.push({ label: '收起', action: () => { hideMedia(id); draw(); } });
      } else if (node?.mediaType) {
        items.push({ label: '展开', action: () => {
          const n = graph.nodes.find(n => n.id === id)!;
          let displayUrl = n.mediaUrl || '';
          // Electron 本地路径 → file://
          if (displayUrl && /^[A-Z]:[\\/]/.test(displayUrl)) {
            displayUrl = 'file:///' + displayUrl.replace(/\\/g, '/').replace(/^[A-Z]:/, (m: string) => m.toLowerCase());
          }
          showMedia(mediaOverlayContainer, id, n.label || n.id, n.mediaType, displayUrl, n.color || '#5B8FF9', () => {
            const sp = pixi!.viewport.toScreen(n.x, n.y);
            const rect = pixi!.app.canvas.getBoundingClientRect();
            return { x: rect.left + sp.x, y: rect.top + sp.y };
          }, () => { pixi!.viewport.pause = true; }, () => { pixi!.viewport.pause = false; });
          draw();
        }});
      }
      if (!node?.mediaType) {
        items.push({ label: '设为图片', action: async () => {
          const url = await safePrompt('图片 URL：');
          if (url) { const n = graph.nodes.find(n => n.id === id); if (n) { n.mediaType = 'image'; n.mediaUrl = url; scheduleSave(); } }
        }});
        items.push({ label: '设为文档', action: async () => {
          const url = await safePrompt('文档内容或 URL：');
          if (url) { const n = graph.nodes.find(n => n.id === id); if (n) { n.mediaType = 'md'; n.mediaUrl = url; scheduleSave(); } }
        }});
      }
      if (isFixedNode(id)) {
        items.push({ label: '解除固定', action: () => { unfixNodes([id]); } });
      } else {
        items.push({ label: '固定', action: () => { fixNode(id); } });
      }
      items.push({ label: '新建子节点', action: () => { const parent = graph.nodes.find(n => n.id === id); const childId = 'n_' + Date.now(); saveUndo(); graph.nodes.push({ id: childId, label: '子节点', radius: 10, headingLevel: Math.min(6, (parent?.headingLevel || 1) + 1), tags: [...(parent?.tags || [])], color: '#5AD8A6', x: (parent?.x || 200) + 60, y: (parent?.y || 200) + 40 }); graph.edges.push({ source: id, target: childId, label: '', color: '#BFBFBF', arrow: defArrow }); scheduleSave(); simManager.initSim(); } });
      items.push({ label: '连线', action: () => { linkMode = true; linkSrc = id; } });
      items.push({ label: '删除', action: () => { saveUndo(); graph.nodes = graph.nodes.filter(n => n.id !== id); graph.edges = graph.edges.filter(e => e.source !== id && e.target !== id); if (selNode === id) clearEd(); scheduleSave(); simManager.initSim(); } });
    } else if (type === 'edge' && id !== null) {
      const idx = parseInt(id);
      items.push({ label: '编辑', action: () => { fillEdge(idx); } });
      items.push({ label: '交换方向', action: () => { const e = graph.edges[idx]; if (e) { saveUndo(); [e.source, e.target] = [e.target, e.source]; scheduleSave(); simManager.initSim(); } } });
      items.push({ label: '删除', action: () => { saveUndo(); graph.edges.splice(idx, 1); if (selEdge === idx) clearEd(); scheduleSave(); simManager.initSim(); } });
    } else if (type === 'group' && id) {
      items.push({ label: '编辑', action: () => { fillGroup(id); } });
    }
    if (items.length > 0) showContextMenu(appShell, mx, my, items);
  };

  const handleLinkTap = (x: number, y: number) => {
    if (!linkMode || !linkSrc) return false;
    const nodes = getSim()?.nodes() || [];
    const n = nodes.find((nd: any) => (nd.x - x) ** 2 + (nd.y - y) ** 2 <= ((nd.radius || 9) + nodeExpand) ** 2);
    if (n) {
      if (linkSrc === n.id) { linkMode = false; linkSrc = null; return true; }
      if (graph.edges.some(e => e.source === linkSrc && e.target === n.id)) { linkMode = false; linkSrc = null; return true; }
      saveUndo(); graph.edges.push({ source: linkSrc, target: n.id, label: '', color: '#BFBFBF', arrow: defArrow });
      scheduleSave(); simManager.initSim();
    }
    linkMode = false; linkSrc = null; return true;
  };

  // --- 事件绑定将在 pixiReady 后进行 ---

  // --- 启动（等待 PixiJS 就绪）---
  // 文件拖拽到画布：自动创建多媒体节点
  appShell.addEventListener('dragover', (e) => { e.preventDefault(); });
  appShell.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !pixi) return;
    const vp = pixi.viewport;
    const rect = pixi.app.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = vp.toWorld(sx, sy);
    const id = 'n_' + Date.now();
    let mediaType = 'md';
    if (/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(file.name)) mediaType = 'image';
    else if (/\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(file.name)) mediaType = 'audio';
    else if (/\.(mp4|webm|mov|avi|mkv)$/i.test(file.name)) mediaType = 'video';
    const url = URL.createObjectURL(file);
    saveUndo(); graph.nodes.push({ id, label: file.name, radius: 12, headingLevel: 4, tags: [], color: '#5B8FF9', x: wp.x, y: wp.y, mediaType, mediaUrl: url });
    scheduleSave(); simManager.initSim(); draw();
  });

  await pixiReady;
  // 流体层模糊滤镜（只设一次）
  // 光晕 / 流体滤镜
  const blurF = new BlurFilter({ strength: 14, quality: 4 });
  const thresholdF = createThresholdFilter();
  const updateBlobFilters = () => {
    if (fluidAppearance) pixi!.blobLayer.filters = [blurF, thresholdF];
    else if (glowAppearance) pixi!.blobLayer.filters = [blurF];
    else pixi!.blobLayer.filters = [];
  };
  updateBlobFilters();
  // 标记图加载完成后才允许 viewport 事件触发绘制
  let readyToDraw = false;

  // viewport 缩放/平移时触发刷新（用于标签显隐等）
  pixi!.viewport.on('moved', () => { if (readyToDraw) draw(); });
  pixi!.viewport.on('zoomed-end', () => { if (readyToDraw) draw(); });

  const eventsCanvas = pixi!.app.canvas as any;
  setupCanvasEvents(eventsCanvas, {
    graph, getSelNode: () => selNode, setSelNode: v => { selNode = v; },
    getSelEdge: () => selEdge, setSelEdge: v => { selEdge = v; },
    getSelGroup: () => selGroup, setSelGroup: v => { selGroup = v; },
    getSimulation: getSim, getTransform: getViewportTransform,
    viewport: pixi!.viewport,
    getCanvas: () => pixi!.app.canvas as any,
    getNodeExpand: () => nodeExpand, getLineExpand: () => lineExpand,
    getDraggingNode: () => draggingNode, setDraggingNode: v => { draggingNode = v; },
    getWasDragged: () => wasDragged, setWasDragged: v => { wasDragged = v; },
    draw, onContextMenu, fixNode, isFixedNode, selectionBox, fixNodes, unfixNodes, appShell, triggerSave: () => scheduleSave(),
    onDragStart: (id: string) => simManager.setDragNode(id), onDragEnd: () => simManager.setDragNode(null),
    getLinkMode: () => linkMode, getLinkSrc: () => linkSrc,
    onLinkCursorMove: (x: number, y: number) => { linkCursorX = x; linkCursorY = y; if (sharedState.directDraw) sharedState.directDraw(); else draw(); },
    initSim: () => simManager.initSim(), clearEd, fillNode,
    onTap: (x: number, y: number) => {
      if (handleLinkTap(x, y)) return;
      const nodes = getSim()?.nodes() || [];
      const n = nodes.find((nd: any) => (nd.x - x) ** 2 + (nd.y - y) ** 2 <= ((nd.radius || 9) + nodeExpand) ** 2);
      if (n) { fillNode(n.id); return; }
      for (let i = 0; i < graph.edges.length; i++) {
        const e = graph.edges[i]; const s = nodes.find((nd: any) => nd.id === e.source), t = nodes.find((nd: any) => nd.id === e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y; const len2 = dx * dx + dy * dy;
        let tp = ((x - s.x) * dx + (y - s.y) * dy) / len2; tp = Math.max(0, Math.min(1, tp));
        if ((x - (s.x + tp * dx)) ** 2 + (y - (s.y + tp * dy)) ** 2 <= (lineExpand + 3) ** 2) { fillEdge(i); return; }
      }
      for (const g of graph.groups) {
        if (g.displayMode === 'none') continue;
        const members = nodes.filter((nd: any) => (nd.tags || []).includes(g.label));
        if (members.length === 0) continue;
        if (g.displayMode === 'fluid') { for (const m of members) { if ((m.x - x) ** 2 + (m.y - y) ** 2 <= ((m.radius || 9) * (g.fluidRadius || 3)) ** 2) { fillGroup(g.id); return; } } continue; }
      }
      clearEd();
    },
  });

  // 启动时强制重建 demo 数据（仅当 demo 标签未开启时，保留用户修改）
  if (!restoreTabs()?.tabs?.includes('demo')) {
    localStorage.removeItem('fg-data-demo');
  }

  // 恢复上次打开的标签页（保证 demo 始终存在）
  const restored = restoreTabs();
  if (restored && restored.tabs.length > 0) {
    openTabs = restored.tabs;
    if (!openTabs.includes('demo')) openTabs.unshift('demo');
    activeTab = restored.active || 'demo';
  } else {
    openTabs = ['demo'];
    activeTab = 'demo';
  }
  renderAllTabs();

  // 诊断：显示可用的存储后端
  const cap = (window as any).Capacitor;
  const diag = [
    'isNative=' + (cap?.isNative?.() ?? 'N/A'),
    'hasSafPlugin=' + !!cap?.Plugins?.SafPlugin,
    'hasFilesystem=' + !!cap?.Plugins?.Filesystem,
    'showDirPicker=' + ('showDirectoryPicker' in window),
    'isHarmonyOS=' + isHarmonyOS(),
  ].join(', ');
  console.log('[DIAG]', diag);

  // 尝试恢复文件夹（优先级: SAF > showDirectoryPicker > Capacitor > localStorage）
  const safDir = safIsAvailable() ? await safRestoreDirectory() : null;
  if (safDir) {
    fileSystemMountPath = safDir.name;
    await refreshFileTree();
  } else {
    fileSystemMountPath = 'graphs';
  await refreshFileTree();
  // Capacitor 可能还没初始化 → 延迟重试几次
  let _retry = 0;
  const _retryRefresh = () => {
    if (_retry++ > 4) return;
    setTimeout(async () => { await refreshFileTree(); }, _retry === 1 ? 500 : 1500);
  };
  try {
    if ((await listFilesMobile()).length === 0) _retryRefresh();
  } catch { _retryRefresh(); }
  // Electron / 桌面模式：有额外文件夹恢复路径
  const ea2 = (window as any).electronAPI;
  if (ea2) {
    const config = await ea2.configRead();
    const savedPath = config.folderPath;
    if (savedPath && await ea2.exists(savedPath)) {
      fileSystemMountPath = savedPath;
      await refreshFileTree();
    }
  } else {
    const savedHandle = await loadFolderHandle();
    if (savedHandle) {
      const ok = await restoreFolder(savedHandle);
      if (ok) { await refreshFileTree(); }
    }
  }
  } // end else (SAF not available or not restored)

  // 在 loadGraphData（触发模拟）之前就把原点屏中
  {
    const p = pixi!;
    if (p.app.canvas.clientWidth > 0) {
      p.viewport.position.set(p.app.canvas.clientWidth / 2, p.app.canvas.clientHeight / 2);
    }
  }
  await loadGraphData(activeTab);
  loadLayouts(); renderModeBar();
  updateGwGh();
  readyToDraw = true;

  // ===== 键盘快捷键 =====
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // 输入控件中不处理快捷键
    const tag = (e.target as HTMLElement)?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
    if (isInput) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selNode) {
        const node = graph.nodes.find(n => n.id === selNode);
        const label = node?.label || selNode;
        confirmAction(`确定删除节点 "${label}"？`).then(ok => {
          if (!ok) return;
          saveUndo(); graph.nodes = graph.nodes.filter(n => n.id !== selNode);
          graph.edges = graph.edges.filter(edge => edge.source !== selNode && edge.target !== selNode);
          clearEd(); scheduleSave(); simManager.initSim();
          showToast('节点已删除', 'info');
        });
      } else if (selEdge !== null) {
        const edgeIdx = selEdge;
        confirmAction('确定删除此连线？').then(ok => {
          if (!ok) return;
          saveUndo(); graph.edges.splice(edgeIdx, 1);
          clearEd(); scheduleSave(); simManager.initSim();
          showToast('连线已删除', 'info');
        });
      } else if (selGroup) {
        confirmAction('确定删除此集合？').then(ok => {
          if (!ok) return;
          saveUndo(); graph.groups = graph.groups.filter(g => g.id !== selGroup);
          clearEd(); scheduleSave(); draw();
          showToast('集合已删除', 'info');
        });
      }
    } else if (ctrl && e.key === 'z') {
      e.preventDefault();
      if (undoManager.undo(graph)) { clearEd(); simManager.initSim(); draw(); showToast('已撤销', 'info'); }
    } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (undoManager.redo(graph)) { clearEd(); simManager.initSim(); draw(); showToast('已重做', 'info'); }
    } else if (ctrl && e.key === 's') {
      e.preventDefault(); saveNow(); showToast('已保存', 'success');
    } else if (e.key === 'f' && !ctrl) {
      e.preventDefault();
      const nodes = getSim()?.nodes();
      if (nodes && nodes.length > 0 && pixi) {
        fitAllNodes();
      }
    } else if (ctrl && e.key === 'n') {
      e.preventDefault();
      addBtn.click();
    } else if (ctrl && e.key === 'd') {
      e.preventDefault();
      if (selNode) {
        const orig = graph.nodes.find(n => n.id === selNode);
        if (orig) {
          const newId = 'n_' + Date.now();
          const copy = JSON.parse(JSON.stringify(orig));
          copy.id = newId; copy.x = (orig.x || 0) + 60; copy.y = (orig.y || 0) + 40;
          delete copy.fx; delete copy.fy; delete copy.fixed;
          saveUndo(); graph.nodes.push(copy);
          scheduleSave(); simManager.initSim(); draw(); fillNode(newId);
          showToast('节点已复制', 'success');
        }
      }
    } else if (e.key === 'Escape') {
      if (linkMode) { linkMode = false; linkSrc = null; linkBtn.style.background = ''; linkBtn.style.color = ''; showToast('已退出连线模式', 'info'); }
      else if (selNode || selEdge !== null || selGroup) { clearEd(); }
    }
  });

  // fitAllNodes 辅助函数
  const fitAllNodes = () => {
    const nodes = getSim()?.nodes();
    if (!nodes || nodes.length === 0 || !pixi) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y);
    }
    const pad = 60;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const canvasW = pixi!.app.canvas.clientWidth;
    const canvasH = pixi!.app.canvas.clientHeight;
    const scale = Math.min(canvasW / Math.max(w, 1), canvasH / Math.max(h, 1), 2);
    const targetX = canvasW / 2 - (minX + maxX) / 2 * scale;
    const targetY = canvasH / 2 - (minY + maxY) / 2 * scale;
    pixi!.viewport.animate({ scale, position: { x: targetX, y: targetY }, time: FIT_ALL_DURATION });
  };

  // 侧边栏折叠动画同步
  window.addEventListener('sidebar-toggle', ((e: CustomEvent) => {
    const collapsed = e.detail?.collapsed;
    const newLeft = collapsed ? `${sidebarCollapsedLeft()}px` : `${sidebarExpandedLeft()}px`;
    floatingTop.style.left = newLeft;
    settingsDet.style.left = newLeft;
  }) as EventListener);

  // 响应式窗口大小调整（移动端横竖屏切换）
  let resizeDebounceTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      const newWidth = getResponsiveSidebarWidth();
      // 仅在展开状态下更新侧边栏宽度
      if (sidebar.sidebar.style.width !== `${SIDEBAR_COLLAPSED_WIDTH}px`) {
        sidebar.sidebar.style.width = `${newWidth}px`;
        const newLeft = `${sidebarExpandedLeft()}px`;
        floatingTop.style.left = newLeft;
        settingsDet.style.left = newLeft;
      }
      // 更新 viewport 尺寸
      if (pixi) {
        pixi.viewport.resize(pixi.app.canvas.clientWidth, pixi.app.canvas.clientHeight);
      }
      draw();
    }, 200);
  });

  // 模拟启动后可能短暂抖动，延迟一帧重新居中
  requestAnimationFrame(() => {
    const vp = pixi!.viewport;
    const cw = pixi!.app.canvas.clientWidth;
    const ch = pixi!.app.canvas.clientHeight;
    if (cw > 0 && ch > 0) vp.position.set(cw / 2, ch / 2);
    draw();
  });

  // 自动检查 GitHub 更新（延迟 3 秒，不阻塞启动）
  setTimeout(async () => {
    const autoUpdate = localStorage.getItem('fg-auto-update') === 'true';
    if (!autoUpdate) return;
    const info = await checkUpdate();
    if (!info) return;
    showUpdateDialog(info, () => {
      const ea = (window as any).electronAPI;
      if (ea?.openExternal) { ea.openExternal(info.htmlUrl); }
      else { window.open(info.htmlUrl, '_blank'); }
    });
  }, 3000);

  // 页面关闭前强制同步保存当前图数据（防止 300ms 防抖期间的修改丢失）
  window.addEventListener('beforeunload', () => {
    if (graph && graph.nodes.length > 0) {
      graph.settings = collectSettings();
      const key = 'fg-data-' + activeTab;
      try { localStorage.setItem(key, JSON.stringify(graph, null, 2)); } catch {}
    }
  });
}

main().catch(console.error);
