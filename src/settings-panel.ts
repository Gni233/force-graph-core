import { safePrompt } from './dialog';

/** 浮动设置面板 + 预设管理 */
export interface SettingsPanelAPI {
  show: () => void;
  hide: () => void;
  updateInfo: () => void;
}

export function createSettingsPanel(
  parent: HTMLElement,
  settingsBody: HTMLElement,
  callbacks: {
    onSavePreset: (name: string) => void;
    onLoadPreset: (name: string) => void;
    onDeletePreset: (name: string) => void;
    onResetDefaults: () => void;
    getPresets: () => { name: string }[];
    onOpenFolder?: () => void;
    getFolderPath?: () => string;
    getAutoUpdate?: () => boolean;
    onToggleAutoUpdate?: (val: boolean) => void;
    onCheckUpdate?: () => void;
  }
): SettingsPanelAPI {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20;' +
    'min-width:380px;max-width:500px;max-height:82vh;overflow-y:auto;' +
    'padding:12px;border:1px solid rgba(255,255,255,0.1);border-radius:10px;' +
    'background:rgba(40,42,48,0.85);backdrop-filter:blur(14px);' +
    '-webkit-backdrop-filter:blur(14px);color:#d0d0d0;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.4);display:none;';

  // 标题栏
  const titleBar = document.createElement('div');
  titleBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
  const dot = document.createElement('div');
  dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.3);margin-right:8px;';
  const titleText = document.createElement('span');
  titleText.textContent = '设置';
  titleText.style.cssText = 'font-weight:bold;font-size:0.95em;';
  const titleLeft = document.createElement('div');
  titleLeft.style.cssText = 'display:flex;align-items:center;cursor:move;';
  titleLeft.appendChild(dot);
  titleLeft.appendChild(titleText);
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '\u00D7';
  closeBtn.style.cssText = 'cursor:pointer;font-size:1.2em;opacity:0.5;';
  closeBtn.onclick = () => { panel.style.display = 'none'; };
  closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; };
  closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.5'; };
  titleBar.appendChild(titleLeft);
  titleBar.appendChild(closeBtn);
  panel.appendChild(titleBar);

  // 拖拽
  let dragInfo: any = null;
  titleLeft.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    titleLeft.setPointerCapture((e as PointerEvent).pointerId);
    dragInfo = { sx: e.clientX, sy: e.clientY, px: parseInt(panel.style.left), py: parseInt(panel.style.top) };
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragInfo) return;
    panel.style.left = (dragInfo.px + e.clientX - dragInfo.sx) + 'px';
    panel.style.top = (dragInfo.py + e.clientY - dragInfo.sy) + 'px';
    panel.style.transform = 'none';
  });
  window.addEventListener('pointerup', () => { dragInfo = null; });

  // 预设管理区
  const presetSection = document.createElement('div');
  presetSection.style.cssText = 'margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);';

  const presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;align-items:center;';

  const renderPresets = () => {
    presetRow.innerHTML = '<span style="font-size:0.8em;opacity:0.5;margin-right:4px;">预设</span>';
    // "默认" 预设始终在最前
    const defaultPill = document.createElement('span');
    defaultPill.textContent = '默认';
    defaultPill.title = '加载默认预设';
    defaultPill.style.cssText = 'font-size:0.72em;padding:1px 8px;cursor:pointer;border-radius:3px;border:1px solid rgba(255,255,255,0.25);white-space:nowrap;';
    defaultPill.onclick = () => callbacks.onLoadPreset('默认');
    defaultPill.onmouseenter = () => { defaultPill.style.background = 'rgba(255,255,255,0.1)'; };
    defaultPill.onmouseleave = () => { defaultPill.style.background = ''; };
    presetRow.appendChild(defaultPill);
    for (const p of callbacks.getPresets()) {
      const pill = document.createElement('span');
      pill.textContent = p.name;
      pill.title = '右键删除';
      pill.style.cssText = 'font-size:0.72em;padding:1px 8px;cursor:pointer;border-radius:3px;border:1px solid rgba(255,255,255,0.18);white-space:nowrap;';
      pill.onclick = () => callbacks.onLoadPreset(p.name);
      pill.oncontextmenu = (e) => { e.preventDefault(); if (confirm(`删除预设 "${p.name}"？`)) callbacks.onDeletePreset(p.name); };
      pill.onmouseenter = () => { pill.style.background = 'rgba(255,255,255,0.1)'; };
      pill.onmouseleave = () => { pill.style.background = ''; };
      presetRow.appendChild(pill);
    }
    const saveBtn = document.createElement('span');
    saveBtn.textContent = '+';
    saveBtn.title = '保存当前为预设';
    saveBtn.style.cssText = 'font-size:0.75em;padding:1px 6px;cursor:pointer;border-radius:3px;border:1px solid rgba(255,255,255,0.15);';
    saveBtn.onclick = async () => { const n = await safePrompt('预设名称：'); if (n) callbacks.onSavePreset(n); };
    presetRow.appendChild(saveBtn);

    const resetBtn = document.createElement('span');
    resetBtn.textContent = '↺';
    resetBtn.title = '恢复预设默认';
    resetBtn.style.cssText = 'font-size:0.75em;padding:1px 6px;cursor:pointer;border-radius:3px;border:1px solid rgba(255,255,255,0.15);color:#e88;';
    resetBtn.onclick = () => callbacks.onResetDefaults();
    presetRow.appendChild(resetBtn);
  };
  renderPresets();
  presetSection.appendChild(presetRow);
  panel.appendChild(presetSection);

  // 目录选择
  if (callbacks.onOpenFolder) {
    const folderSection = document.createElement('div');
    folderSection.style.cssText = 'margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);';
    const folderRow = document.createElement('div');
    folderRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
    const openBtn = document.createElement('button');
    openBtn.textContent = '打开目录';
    openBtn.style.cssText = 'font-size:0.75em;padding:2px 8px;cursor:pointer;background:rgba(255,255,255,0.08);color:#ccc;border:1px solid rgba(255,255,255,0.15);border-radius:4px;';
    folderRow.appendChild(openBtn);
    const pathLabel = document.createElement('span');
    openBtn.onclick = async () => {
      await callbacks.onOpenFolder?.();
      pathLabel.textContent = callbacks.getFolderPath?.() || '（未选择）';
    };
    pathLabel.style.cssText = 'font-size:0.72em;opacity:0.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;';
    pathLabel.textContent = callbacks.getFolderPath?.() || '（未选择）';
    folderRow.appendChild(pathLabel);
    folderSection.appendChild(folderRow);
    panel.appendChild(folderSection);
  }

  // 自动检查更新
  if (callbacks.getAutoUpdate) {
    const updateSection = document.createElement('div');
    updateSection.style.cssText = 'margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);';
    const updateRow = document.createElement('label');
    updateRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.8em;cursor:pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = callbacks.getAutoUpdate();
    cb.addEventListener('change', () => callbacks.onToggleAutoUpdate?.(cb.checked));
    updateRow.appendChild(cb);
    const lbl = document.createElement('span');
    lbl.textContent = '自动检查GitHub更新';
    lbl.style.cssText = 'opacity:0.7;flex:1;';
    updateRow.appendChild(lbl);
    const checkBtn = document.createElement('button');
    checkBtn.textContent = '检查更新';
    checkBtn.style.cssText = 'font-size:0.72em;padding:2px 8px;cursor:pointer;background:rgba(255,255,255,0.08);color:#ccc;border:1px solid rgba(255,255,255,0.15);border-radius:4px;';
    checkBtn.onclick = (e) => { e.preventDefault(); callbacks.onCheckUpdate?.(); };
    updateRow.appendChild(checkBtn);
    updateSection.appendChild(updateRow);
    panel.appendChild(updateSection);
  }

  const bodyWrap = document.createElement('div');
  bodyWrap.appendChild(settingsBody);
  panel.appendChild(bodyWrap);
  parent.appendChild(panel);

  return {
    show: () => { panel.style.display = 'block'; renderPresets(); },
    hide: () => { panel.style.display = 'none'; },
    updateInfo: () => { renderPresets(); },
  };
}
