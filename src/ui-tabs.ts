export interface TabCallbacks {
  onSwitchTab: (fileName: string) => void;
  onCloseTab: (fileName: string) => void;
  onNewTab: () => void;
  onReorder?: (from: number, to: number) => void;
}

export function createTabBar(container: HTMLElement, callbacks: TabCallbacks) {
  const tabBar = document.createElement('div');
  tabBar.style.cssText =
    'display:flex;align-items:center;gap:2px;padding:2px 4px;' +
    'background:transparent;' +
    'border-bottom:1px solid rgba(255,255,255,0.08);' +
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
    'border:1px solid rgba(255,255,255,0.15);border-radius:3px;' +
    'background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);' +
    'flex-shrink:0;line-height:1.5;';
  addBtn.onclick = callbacks.onNewTab;
  tabBar.appendChild(addBtn);

  container.insertBefore(tabBar, container.firstChild);

  const renderTabs = (openTabs: string[], activeTab: string) => {
    tabsContainer.innerHTML = '';
    for (let i = 0; i < openTabs.length; i++) {
      const fileName = openTabs[i];
      const tab = document.createElement('div');
      const isActive = fileName === activeTab;
      const displayName = fileName.replace(/\.json$/, '');

      tab.draggable = true;
      tab.style.cssText =
        'display:flex;align-items:center;gap:3px;padding:3px 8px 3px 10px;' +
        'cursor:grab;border-radius:5px 5px 0 0;font-size:0.82em;' +
        'white-space:nowrap;flex:1 1 auto;min-width:60px;max-width:200px;user-select:none;' +
        (isActive
          ? 'background:var(--fg-bg,#fff);border:1px solid var(--fg-border,#d0d0d0);' +
            'border-bottom:2px solid var(--fg-bg,#fff);font-weight:600;margin-bottom:-1px;z-index:1;'
          : 'background:transparent;border:1px solid transparent;color:var(--fg-tab-inactive,rgba(255,255,255,0.55));');

      tab.onclick = () => { if (!isActive) callbacks.onSwitchTab(fileName); };
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
      label.textContent = displayName;
      label.style.cssText = 'max-width:120px;overflow:hidden;text-overflow:ellipsis;flex:1;';
      label.onclick = (e) => { e.stopPropagation(); if (!isActive) callbacks.onSwitchTab(fileName); };
      tab.appendChild(label);

      if (openTabs.length > 1) {
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '\u00D7';
        closeBtn.title = '关闭页面';
        closeBtn.style.cssText =
          'margin-left:auto;color:rgba(255,255,255,0.4);font-size:1.3em;line-height:0.8;' +
          'cursor:pointer;padding:1px 3px;border-radius:2px;flex-shrink:0;';
        closeBtn.onmouseenter = () => { closeBtn.style.color = '#fff'; closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
        closeBtn.onmouseleave = () => { closeBtn.style.color = 'rgba(255,255,255,0.4)'; closeBtn.style.background = 'transparent'; };
        closeBtn.onclick = (e) => { e.stopPropagation(); callbacks.onCloseTab(fileName); };
        tab.appendChild(closeBtn);
      }

      tab.onmouseenter = () => { if (!isActive) tab.style.background = 'rgba(0,0,0,0.06)'; };
      tab.onmouseleave = () => { if (!isActive) tab.style.background = 'transparent'; };

      tabsContainer.appendChild(tab);
    }
  };

  return { renderTabs, tabBar };
}
