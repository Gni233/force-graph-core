export interface TabCallbacks {
  onSwitchTab: (fileName: string) => void;
  onCloseTab: (fileName: string) => void;
  onNewTab: () => void;
  onReorder?: (from: number, to: number) => void;
}

const V = (name: string, fallback: string) => `var(${name},${fallback})`;

export function createTabBar(container: HTMLElement, callbacks: TabCallbacks) {
  const tabBar = document.createElement('div');
  tabBar.style.cssText =
    'display:flex;align-items:center;gap:2px;padding:2px 4px;' +
    'background:transparent;' +
    `border-bottom:1px solid ${V('--fg-border-light', 'rgba(255,255,255,0.08)')};` +
    'overflow:hidden;flex-shrink:0;min-height:32px;';

  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText =
    'display:flex;align-items:flex-end;gap:1px;flex:1;' +
    'overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;';
  tabBar.appendChild(tabsContainer);

  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.title = '新建页面';
  addBtn.style.cssText =
    'font-size:1.1em;padding:1px 8px;cursor:pointer;' +
    `border:1px solid ${V('--fg-border-light', 'rgba(255,255,255,0.15)')};` +
    `border-radius:${V('--fg-radius-sm', '3px')};` +
    `background:${V('--fg-button-bg', 'rgba(255,255,255,0.1)')};` +
    `color:${V('--fg-text-muted', 'rgba(255,255,255,0.7)')};` +
    'flex-shrink:0;line-height:1.5;' +
    `transition:background var(--fg-transition-fast,0.15s ease);`;
  addBtn.onclick = callbacks.onNewTab;
  tabBar.appendChild(addBtn);

  container.insertBefore(tabBar, container.firstChild);

  const renderTabs = (openTabs: string[], activeTab: string, dirtyFiles?: Set<string>) => {
    tabsContainer.innerHTML = '';
    for (let i = 0; i < openTabs.length; i++) {
      const fileName = openTabs[i];
      const tab = document.createElement('div');
      const isActive = fileName === activeTab;
      const isDirty = dirtyFiles?.has(fileName);
      const displayName = fileName.replace(/\.json$/, '');

      tab.draggable = true;
      tab.style.cssText =
        'display:flex;align-items:center;gap:3px;padding:3px 8px 3px 10px;' +
        'cursor:grab;border-radius:5px 5px 0 0;font-size:' + V('--fg-font-sm', '0.8em') + ';' +
        'white-space:nowrap;flex:1 1 auto;min-width:60px;max-width:200px;user-select:none;' +
        `transition:background var(--fg-transition-fast,0.15s ease),color var(--fg-transition-fast,0.15s ease);` +
        (isActive
          ? `background:${V('--fg-tab-active-bg', '#fff')};` +
            `border:1px solid ${V('--fg-tab-active-border', '#d0d0d0')};` +
            `border-bottom:2px solid ${V('--fg-tab-active-bg', '#fff')};` +
            'font-weight:600;margin-bottom:-1px;z-index:1;'
          : `background:transparent;border:1px solid transparent;` +
            `color:${V('--fg-tab-inactive', 'rgba(255,255,255,0.55)')};`);

      tab.onclick = () => { if (!isActive) callbacks.onSwitchTab(fileName); };
      // 触屏长按菜单（移动端无拖拽排序，显示左移/右移）
      let tabLongPressTimer: ReturnType<typeof setTimeout> | null = null;
      tab.addEventListener('touchstart', (ev: TouchEvent) => {
        if (openTabs.length <= 1) return;
        tabLongPressTimer = setTimeout(() => {
          const menu = document.createElement('div');
          menu.style.cssText =
            `position:fixed;left:${ev.touches[0].clientX}px;top:${ev.touches[0].clientY}px;z-index:200;` +
            `background:${V('--fg-surface-glass','rgba(40,42,48,0.9)')};` +
            `border:1px solid ${V('--fg-glass-border','rgba(255,255,255,0.15)')};` +
            `border-radius:6px;padding:4px 0;min-width:80px;` +
            `font-size:${V('--fg-font-sm','0.8em')};color:${V('--fg-text','#ccc')};` +
            `backdrop-filter:blur(10px);box-shadow:${V('--fg-shadow-md','0 4px 16px rgba(0,0,0,0.3)')};`;
          const mk = (t: string, fn: () => void) => {
            const mi = document.createElement('div'); mi.textContent = t;
            mi.style.cssText = 'padding:3px 8px;cursor:pointer;';
            mi.onmouseenter = () => mi.style.background = V('--fg-button-hover','rgba(255,255,255,0.12)');
            mi.onmouseleave = () => mi.style.background = '';
            mi.onclick = () => { fn(); menu.remove(); }; return mi;
          };
          if (i > 0) menu.appendChild(mk('左移', () => callbacks.onReorder?.(i, i - 1)));
          if (i < openTabs.length - 1) menu.appendChild(mk('右移', () => callbacks.onReorder?.(i, i + 1)));
          document.body.appendChild(menu);
          const close = (e2: Event) => { if (!menu.contains(e2.target as Node)) { menu.remove(); clean(); } };
          const clean = () => { document.removeEventListener('click', c); document.removeEventListener('touchend', c); };
          const c = close as EventListener;
          setTimeout(() => { document.addEventListener('click', c); document.addEventListener('touchend', c); }, 0);
        }, 500);
      }, { passive: true });
      tab.addEventListener('touchmove', () => { if (tabLongPressTimer) { clearTimeout(tabLongPressTimer); tabLongPressTimer = null; } }, { passive: true });
      tab.addEventListener('touchend', () => { if (tabLongPressTimer) { clearTimeout(tabLongPressTimer); tabLongPressTimer = null; } });
      tab.addEventListener('touchcancel', () => { if (tabLongPressTimer) { clearTimeout(tabLongPressTimer); tabLongPressTimer = null; } });
      tab.addEventListener('dragstart', (e) => {
        e.dataTransfer!.setData('text/plain', String(i));
        e.dataTransfer!.effectAllowed = 'move';
      });
      tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
      });
      tab.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer!.getData('text/plain'));
        if (!isNaN(from) && from !== i && callbacks.onReorder) {
          callbacks.onReorder(from, i);
        }
      });

      const label = document.createElement('span');
      label.textContent = displayName + (isDirty ? ' \u25CF' : '');
      label.style.cssText = 'max-width:120px;overflow:hidden;text-overflow:ellipsis;flex:1;';
      if (isDirty) label.style.color = V('--fg-accent', '#5B8FF9');
      label.onclick = (e) => { e.stopPropagation(); if (!isActive) callbacks.onSwitchTab(fileName); };
      tab.appendChild(label);

      if (openTabs.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00D7';
        closeBtn.title = '关闭页面';
        closeBtn.style.cssText =
          `margin-left:auto;color:${V('--fg-text-muted', 'rgba(255,255,255,0.4)')};` +
          'font-size:1.3em;line-height:0.8;cursor:pointer;padding:1px 3px;border-radius:2px;flex-shrink:0;' +
          `transition:all var(--fg-transition-fast,0.15s ease);`;
        closeBtn.onmouseenter = () => {
          closeBtn.style.color = V('--fg-text', '#fff');
          closeBtn.style.background = V('--fg-button-hover', 'rgba(255,255,255,0.2)');
        };
        closeBtn.onmouseleave = () => {
          closeBtn.style.color = V('--fg-text-muted', 'rgba(255,255,255,0.4)');
          closeBtn.style.background = 'transparent';
        };
        closeBtn.onclick = (e) => { e.stopPropagation(); callbacks.onCloseTab(fileName); };
        tab.appendChild(closeBtn);
      }

      tab.onmouseenter = () => {
        if (!isActive) tab.style.background = V('--fg-sidebar-item-hover', 'rgba(0,0,0,0.06)');
      };
      tab.onmouseleave = () => {
        if (!isActive) tab.style.background = 'transparent';
      };

      tabsContainer.appendChild(tab);
    }
  };

  return { renderTabs, tabBar };
}
