export interface SidebarCallbacks {
  onSelectFile: (path: string) => void;
  onNewFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newName: string) => void;
  onOpenFolder: () => void;
  onCopyFile?: (path: string) => void;
  onNewFolder?: (path: string) => void;
  onMoveFile?: (srcPath: string, dstDir: string) => void;
}

export interface FileTreeItem {
  name: string;
  kind: 'file' | 'directory';
  children: FileTreeItem[];
}

export function createSidebar(
  parent: HTMLElement,
  callbacks: SidebarCallbacks
) {
  const { onSelectFile, onNewFile, onDeleteFile, onRenameFile, onOpenFolder, onCopyFile, onNewFolder, onMoveFile } = callbacks;

  const sidebar = document.createElement('div');
  sidebar.style.cssText = 'width:240px;min-width:180px;display:flex;flex-direction:column;background:#2d2d2d;color:#ccc;border-right:1px solid #444;font-size:0.85em;height:100%;overflow:hidden;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #444;';
  const title = document.createElement('span');
  title.textContent = 'Force Graph';
  title.style.cssText = 'font-weight:bold;font-size:1em;color:#e0e0e0;';
  header.appendChild(title);
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = '✕';
  collapseBtn.title = '折叠侧边栏';
  collapseBtn.style.cssText = 'background:none;border:none;color:#aaa;cursor:pointer;font-size:0.9em;padding:0 4px;';
  header.appendChild(collapseBtn);
  sidebar.appendChild(header);

  const newRow = document.createElement('div');
  newRow.style.cssText = 'padding:4px 10px;border-bottom:1px solid #444;';
  const newFileBtn = document.createElement('button');
  newFileBtn.textContent = '+ 新建图';
  newFileBtn.title = '在当前目录下创建新图文件';
  newFileBtn.style.cssText = 'background:none;border:none;color:#aaa;cursor:pointer;padding:3px 0;width:100%;text-align:left;';
  newFileBtn.onclick = () => {
    const name = prompt('输入图文件名（自动加 .json）：');
    if (name) onNewFile(name.endsWith('.json') ? name : name + '.json');
  };
  newRow.appendChild(newFileBtn);
  sidebar.appendChild(newRow);

  const fileTree = document.createElement('div');
  fileTree.style.cssText = 'flex:1;overflow-y:auto;padding:4px 0;';
  sidebar.appendChild(fileTree);

  let collapsed = false;
  let currentFile: string | null = null;
  let treeData: FileTreeItem[] = [];
  const openDirs = new Set<string>();

  // 右键菜单工厂
  const showMenu = (e: MouseEvent, items: { text: string; action: () => void }[]) => {
    e.preventDefault();
    const menu = document.createElement('div');
    menu.style.cssText = `position:absolute;left:${e.clientX - sidebar.getBoundingClientRect().left}px;top:${e.clientY - sidebar.getBoundingClientRect().top}px;z-index:100;background:#3a3a3a;border:1px solid #555;border-radius:4px;padding:4px 0;min-width:100px;font-size:0.85em;`;
    items.forEach(it => {
      const mi = document.createElement('div');
      mi.textContent = it.text; mi.style.cssText = 'padding:4px 10px;cursor:pointer;';
      mi.onmouseenter = () => mi.style.background = '#555';
      mi.onmouseleave = () => mi.style.background = '';
      mi.onclick = () => { it.action(); menu.remove(); };
      menu.appendChild(mi);
    });
    sidebar.appendChild(menu);
    const close = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) { menu.remove(); document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 0);
  };

  // 拖拽文件到文件夹
  const dragState = { srcPath: '', el: null as HTMLElement | null };
  let lastDropTarget: HTMLElement | null = null;

  const renderTree = (items: FileTreeItem[], container: HTMLElement, depth: number, parentPath: string) => {
    items.forEach(item => {
      const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      const indent = depth * 14;

      if (item.kind === 'directory') {
        const dirItem = document.createElement('div');
        dirItem.style.cssText = `display:flex;align-items:center;gap:4px;padding:2px 10px 2px ${10 + indent}px;`;

        const toggle = document.createElement('span');
        const isOpen = openDirs.has(fullPath);
        toggle.textContent = isOpen ? '▾' : '▸';
        toggle.style.cssText = 'width:12px;font-size:0.7em;cursor:pointer;flex-shrink:0;';
        toggle.onclick = () => {
          if (openDirs.has(fullPath)) openDirs.delete(fullPath);
          else openDirs.add(fullPath);
          toggle.textContent = openDirs.has(fullPath) ? '▾' : '▸';
          renderChildren();
        };
        dirItem.appendChild(toggle);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        nameSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        dirItem.appendChild(nameSpan);

        // 右键菜单（文件夹）
        dirItem.oncontextmenu = (e) => {
          showMenu(e, [
            { text: '新建图', action: () => {
              const name = prompt('图文件名（自动加 .json）：');
              if (name) onNewFile(fullPath + '/' + (name.endsWith('.json') ? name : name + '.json'));
            }},
            { text: '新建文件夹', action: () => {
              const name = prompt('文件夹名：');
              if (name) onNewFolder?.(fullPath + '/' + name);
            }},
          ]);
        };

        // 拖放目标
        dirItem.addEventListener('dragover', (ev) => { ev.preventDefault(); dirItem.style.background = '#444'; });
        dirItem.addEventListener('dragleave', () => { dirItem.style.background = ''; });
        dirItem.addEventListener('drop', (ev) => {
          ev.preventDefault(); dirItem.style.background = '';
          const src = (ev.dataTransfer?.getData('text/plain') || '');
          if (src && src !== fullPath) onMoveFile?.(src, fullPath);
        });

        container.appendChild(dirItem);

        const childrenContainer = document.createElement('div');
        childrenContainer.style.cssText = `margin-left:${7 + indent}px;border-left:1px solid rgba(255,255,255,0.08);`;
        childrenContainer.style.display = 'none';
        container.appendChild(childrenContainer);

        function renderChildren() {
          childrenContainer.innerHTML = '';
          if (openDirs.has(fullPath)) {
            childrenContainer.style.display = '';
            renderTree(item.children, childrenContainer, depth + 1, fullPath);
          } else {
            childrenContainer.style.display = 'none';
          }
        }
        renderChildren();
      } else {
        const fileItem = document.createElement('div');
        fileItem.draggable = true;
        fileItem.style.cssText = `display:flex;align-items:center;gap:6px;padding:3px 10px 3px ${10 + 12 + indent}px;cursor:pointer;${fullPath === currentFile ? 'background:#3a3a3a;color:#fff;' : ''}`;
        fileItem.onmouseenter = () => { if (fullPath !== currentFile) fileItem.style.background = '#333'; };
        fileItem.onmouseleave = () => { if (fullPath !== currentFile) fileItem.style.background = ''; };

        fileItem.addEventListener('dragstart', (ev) => {
          ev.dataTransfer?.setData('text/plain', fullPath);
        });

        const dot = document.createElement('span');
        dot.textContent = '\u00B7';
        dot.style.cssText = 'font-size:1.2em;line-height:0;flex-shrink:0;opacity:0.5;';
        fileItem.appendChild(dot);

        const label = document.createElement('span');
        label.textContent = item.name.replace('.json', '');
        label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        fileItem.appendChild(label);

        fileItem.onclick = () => {
          currentFile = fullPath;
          updateFileTree(treeData, fullPath);
          onSelectFile(fullPath);
        };

        fileItem.oncontextmenu = (e) => {
          showMenu(e, [
            { text: '重命名', action: () => {
              const newName = prompt('新文件名：', item.name);
              if (newName && newName !== item.name) onRenameFile(fullPath, newName);
            }},
            { text: '创建副本', action: () => { onCopyFile?.(fullPath); } },
            { text: '删除', action: () => {
              if (confirm(`确定删除 ${item.name}？`)) onDeleteFile(fullPath);
            }},
          ]);
        };

        container.appendChild(fileItem);
      }
    });
  };

  const updateFileTree = (items: FileTreeItem[], activeFile?: string | null) => {
    treeData = items;
    if (activeFile !== undefined) currentFile = activeFile;
    fileTree.innerHTML = '';
    if (treeData.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '（无文件）';
      empty.style.cssText = 'padding:20px;color:#666;text-align:center;';
      fileTree.appendChild(empty);
    } else {
      renderTree(treeData, fileTree, 0, '');
    }
  };

  // 空白区右键：新建文件夹或图
  fileTree.oncontextmenu = (e) => {
    if ((e.target as HTMLElement) !== fileTree) return;
    showMenu(e, [
      { text: '新建图', action: () => {
        const name = prompt('输入图文件名（自动加 .json）：');
        if (name) onNewFile(name.endsWith('.json') ? name : name + '.json');
      }},
      { text: '新建文件夹', action: () => {
        const name = prompt('文件夹名：');
        if (name) onNewFolder?.(name);
      }},
    ]);
  };

  const setFolderPath = (path: string) => {
    folderPath.textContent = path || '（未选择）';
  };

  collapseBtn.onclick = () => {
    collapsed = !collapsed;
    if (collapsed) {
      sidebar.style.width = '32px'; sidebar.style.minWidth = '32px';
      title.style.display = 'none'; newRow.style.display = 'none';
      fileTree.style.display = 'none'; settingsSection.style.display = 'none';
      collapseBtn.textContent = '▸';
    } else {
      sidebar.style.width = '240px'; sidebar.style.minWidth = '180px';
      title.style.display = ''; newRow.style.display = '';
      fileTree.style.display = ''; settingsSection.style.display = '';
      collapseBtn.textContent = '✕';
    }
  };

  const settingsSection = document.createElement('div');
  settingsSection.style.cssText = 'padding:8px 10px;border-top:1px solid #444;margin-top:auto;';
  const settingsTitle = document.createElement('div');
  settingsTitle.textContent = '应用设置';
  settingsTitle.style.cssText = 'font-weight:bold;color:#999;font-size:0.8em;margin-bottom:6px;';
  settingsSection.appendChild(settingsTitle);

  const folderRow = document.createElement('div');
  folderRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;';
  const openFolderBtn = document.createElement('button');
  openFolderBtn.textContent = '打开目录';
  openFolderBtn.style.cssText = 'background:#3a3a3a;color:#e0e0e0;border:1px solid #555;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:0.8em;';
  openFolderBtn.onclick = onOpenFolder;
  folderRow.appendChild(openFolderBtn);
  const folderPath = document.createElement('span');
  folderPath.style.cssText = 'font-size:0.75em;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  folderPath.textContent = '（未选择）';
  folderRow.appendChild(folderPath);
  settingsSection.appendChild(folderRow);

  const cardLayoutRow = document.createElement('div');
  cardLayoutRow.style.cssText = 'display:flex;align-items:center;gap:6px;';
  const cardLayoutChk = document.createElement('input');
  cardLayoutChk.type = 'checkbox';
  const cardLayoutLabel = document.createElement('span');
  cardLayoutLabel.textContent = '卡片布局';
  cardLayoutRow.appendChild(cardLayoutChk);
  cardLayoutRow.appendChild(cardLayoutLabel);
  settingsSection.appendChild(cardLayoutRow);
  sidebar.appendChild(settingsSection);

  const CARD_KEY = 'fg-card-layout';
  const getCardLayout = () => localStorage.getItem(CARD_KEY) === '1';
  const setCardLayout = (v: boolean) => { localStorage.setItem(CARD_KEY, v ? '1' : '0'); };
  cardLayoutChk.checked = getCardLayout();
  document.body.classList.toggle('card-layout', getCardLayout());
  cardLayoutChk.addEventListener('change', () => {
    setCardLayout(cardLayoutChk.checked);
    document.body.classList.toggle('card-layout', cardLayoutChk.checked);
  });

  parent.appendChild(sidebar);
  return { sidebar, updateFileTree, setFolderPath, getCurrentFile: () => currentFile };
}
