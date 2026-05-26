/**
 * 多媒体节点：在画布上方叠加 HTML 元素显示图片/音频/视频/MD
 */
export interface MediaOverlay {
  el: HTMLElement;
  nodeId: string;
  type: 'image' | 'audio' | 'video' | 'md';
  offsetX: number;
  offsetY: number;
}

const overlays: Map<string, MediaOverlay> = new Map();

/** 把本地路径转 file:// URL */
function toFileUrl(p: string): string {
  if (/^[A-Z]:[\\/]/.test(p)) return 'file:///' + p.replace(/\\/g, '/').replace(/^[A-Z]:/, (m: string) => m.toLowerCase());
  return p;
}

export function showMedia(
  container: HTMLElement,
  nodeId: string,
  label: string,
  type: 'image' | 'audio' | 'video' | 'md',
  url: string,
  borderColor: string,
  getWorldPos: () => { x: number; y: number },
  onDragStart?: () => void,
  onDragEnd?: () => void
) {
  hideMedia(nodeId);
  const el = document.createElement('div');
  el.setAttribute('data-media-id', nodeId);
  el.style.cssText =
    'position:absolute;z-index:15;border:3px solid ' + borderColor + ';' +
    'border-radius:0 8px 8px 8px;overflow:visible;background:rgba(40,42,48,0.92);' +
    'pointer-events:auto;box-shadow:0 4px 16px rgba(0,0,0,0.3);';
  const fileUrl = toFileUrl(url);

  // 节点名标签（左上角伸出）
  const nameTag = document.createElement('div');
  nameTag.textContent = label;
  nameTag.style.cssText =
    'position:absolute;top:-22px;left:-3px;background:' + borderColor + ';color:#fff;' +
    'font-size:0.7em;padding:2px 8px;border-radius:4px 4px 0 0;white-space:nowrap;' +
    'max-width:200px;overflow:hidden;text-overflow:ellipsis;pointer-events:none;';
  el.appendChild(nameTag);

  // 拖拽手柄
  const handle = document.createElement('div');
  handle.style.cssText =
    'display:flex;align-items:center;justify-content:center;height:18px;' +
    'cursor:move;border-bottom:1px solid rgba(255,255,255,0.1);padding:2px 0;' +
    'touch-action:none;';
  const dot = document.createElement('div');
  dot.style.cssText = 'width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.3);';
  handle.appendChild(dot);
  el.appendChild(handle);

  // 内容
  const body = document.createElement('div');
  body.className = 'media-body';
  if (type === 'image') {
    body.innerHTML = `<img src="${escapeAttr(fileUrl)}" style="display:block;max-width:320px;max-height:320px;" />`;
  } else if (type === 'audio') {
    body.innerHTML = `<audio controls src="${escapeAttr(fileUrl)}" style="width:100%;height:40px;display:block;"></audio>`;
    body.style.padding = '4px 8px';
    el.style.width = '300px'; // 初始宽度，可伸缩
  } else if (type === 'video') {
    // 白色半透明播放三角图标
    const playIcon = document.createElement('div');
    playIcon.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:0;height:0;border-left:18px solid rgba(255,255,255,0.25);' +
      'border-top:11px solid transparent;border-bottom:11px solid transparent;' +
      'pointer-events:none;z-index:1;';
    body.style.position = 'relative';
    body.appendChild(playIcon);
    if (/bilibili\.com|b23\.tv/i.test(url)) {
      const bv = url.match(/BV\w+/)?.[0] || '';
      // B站嵌入播放器需要 autoplay=0 才能有声音（浏览器策略）
      body.innerHTML = `<iframe src="//player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&autoplay=0"
        style="width:340px;height:220px;border:none;" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
    } else if (/youtube\.com|youtu\.be/i.test(url)) {
      const vid = url.match(/(?:v=|be\/)([\w-]+)/)?.[1] || '';
      body.innerHTML = `<iframe src="//www.youtube.com/embed/${vid}"
        style="width:340px;height:220px;border:none;" allowfullscreen></iframe>`;
    } else {
      body.innerHTML = `<video controls src="${escapeAttr(fileUrl)}" style="max-width:340px;max-height:260px;display:block;"></video>`;
    }
  } else if (type === 'md') {
    // 文档图标
    const docIcon = document.createElement('div');
    docIcon.style.cssText =
      'position:absolute;top:6px;left:10px;width:12px;height:15px;border:1.5px solid rgba(255,255,255,0.3);border-radius:2px;pointer-events:none;z-index:1;';
    const lines = document.createElement('div');
    lines.style.cssText = 'margin:3px 2px;';
    for (let i = 0; i < 3; i++) {
      const l = document.createElement('div');
      l.style.cssText = `width:${6-i}px;height:1px;background:rgba(255,255,255,0.3);margin-bottom:1px;`;
      lines.appendChild(l);
    }
    docIcon.appendChild(lines);
    body.style.position = 'relative';
    body.appendChild(docIcon);
    const mdDiv = document.createElement('div');
    mdDiv.style.cssText += 'margin-left:18px;';
    mdDiv.contentEditable = 'true';
    mdDiv.style.cssText =
      'max-width:340px;max-height:320px;overflow-y:auto;padding:8px;color:#d0d0d0;font-size:0.85em;white-space:pre-wrap;outline:none;';
    mdDiv.textContent = url || '(点击编辑)';
    let mdSaveTimer: any;
    mdDiv.addEventListener('input', () => {
      clearTimeout(mdSaveTimer);
      mdSaveTimer = setTimeout(() => {
        const n = (window as any).__graphNodes?.find((n: any) => n.id === nodeId);
        if (n) { n.mediaUrl = mdDiv.textContent; (window as any).__triggerSave?.(); }
      }, 500);
    });
    body.appendChild(mdDiv);
  }
  el.appendChild(body);

  // 收起按钮
  const closeBtn = document.createElement('div');
  closeBtn.textContent = '\u00D7';
  closeBtn.style.cssText =
    'position:absolute;top:0;right:6px;font-size:1.4em;opacity:0.5;cursor:pointer;color:#ccc;line-height:1;padding:0 2px;z-index:1;';
  closeBtn.onclick = () => hideMedia(nodeId);
  closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; };
  closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.5'; };
  el.appendChild(closeBtn);

  // 伸缩手柄（右下角圆点）
  const resizer = document.createElement('div');
  resizer.style.cssText =
    'position:absolute;right:4px;bottom:4px;width:8px;height:8px;border-radius:50%;' +
    'background:rgba(255,255,255,0.3);cursor:nwse-resize;z-index:2;touch-action:none;';
  let resizing = false, rsx = 0, rsy = 0, rsw = 0, rsh = 0;
  resizer.addEventListener('dblclick', () => {
    el.style.width = ''; el.style.height = '';
  });
  resizer.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    resizer.setPointerCapture(e.pointerId);
    resizing = true; rsx = e.clientX; rsy = e.clientY;
    rsw = el.offsetWidth; rsh = el.offsetHeight;
    onDragStart?.();
  });
  window.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    let dw = Math.max(120, rsw + (e.clientX - rsx));
    let dh = Math.max(60, rsh + (e.clientY - rsy));
    // 图片和视频等比缩放
    if (type === 'image' || type === 'video') {
      const ratio = rsw / Math.max(1, rsh);
      if (Math.abs(e.clientX - rsx) > Math.abs(e.clientY - rsy)) {
        dh = Math.max(60, dw / ratio);
      } else {
        dw = Math.max(120, dh * ratio);
      }
    }
    el.style.width = dw + 'px';
    el.style.height = dh + 'px';
    // 连带缩放内部内容（音频只横向伸展，不设高度）
    el.querySelectorAll('img, video, iframe, .media-body, [contenteditable]').forEach((inner) => {
      const iw = dw - 16, ih = dh - 30;
      (inner as HTMLElement).style.maxWidth = iw + 'px';
      (inner as HTMLElement).style.maxHeight = ih + 'px';
      (inner as HTMLElement).style.width = iw + 'px';
      (inner as HTMLElement).style.height = ih + 'px';
    });
    const audio = el.querySelector('audio');
    if (audio) { audio.style.width = (dw - 16) + 'px'; }
  });
  window.addEventListener('pointerup', () => {
    if (resizing) { resizing = false; onDragEnd?.(); }
  });
  el.appendChild(resizer);

  container.appendChild(el);

  const ov: MediaOverlay = { el, nodeId, type, offsetX: 0, offsetY: 0 };
  overlays.set(nodeId, ov);

  // 拖拽逻辑
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  handle.addEventListener('dblclick', () => { ov.offsetX = 0; ov.offsetY = 0; });
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    dragging = true; sx = e.clientX; sy = e.clientY; ox = ov.offsetX; oy = ov.offsetY;
    onDragStart?.();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ov.offsetX = ox + (e.clientX - sx);
    ov.offsetY = oy + (e.clientY - sy);
    el.style.left = (parseFloat(el.style.left) || 0) + (e.clientX - sx) + 'px';
    el.style.top = (parseFloat(el.style.top) || 0) + (e.clientY - sy) + 'px';
    // 更新相对偏移基准
    sx = e.clientX; sy = e.clientY;
    ox = ov.offsetX; oy = ov.offsetY;
  });
  window.addEventListener('pointerup', () => {
    if (dragging) { dragging = false; onDragEnd?.(); }
  });

  positionMedia(nodeId, getWorldPos);
}

export function positionMedia(nodeId: string, getWorldPos: () => { x: number; y: number }) {
  const ov = overlays.get(nodeId);
  if (!ov) return;
  const pos = getWorldPos();
  const w = ov.el.offsetWidth || 200;
  const h = ov.el.offsetHeight || 100;
  ov.el.style.left = (pos.x - w / 2 + ov.offsetX) + 'px';
  ov.el.style.top = (pos.y - h / 2 + ov.offsetY) + 'px';
}

export function hideMedia(nodeId: string) {
  const ov = overlays.get(nodeId);
  if (ov) { ov.el.remove(); overlays.delete(nodeId); }
}

export function getMediaSize(nodeId: string): { w: number; h: number } | null {
  const ov = overlays.get(nodeId);
  if (!ov) return null;
  return { w: ov.el.offsetWidth || 200, h: ov.el.offsetHeight || 100 };
}

export function isExpanded(nodeId: string) {
  return overlays.has(nodeId);
}

export function clearAllMedia() {
  for (const [id] of overlays) hideMedia(id);
}

function escapeAttr(s: string) {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
