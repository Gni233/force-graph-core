/**
 * 鸿蒙 WebView 文件系统模块
 * 使用 localStorage 存储图数据（无原生文件系统访问）
 */
import { GraphData } from './data/storage';

const STORAGE_PREFIX = 'fg-data-';

function storageKey(fileName: string): string {
  return STORAGE_PREFIX + fileName;
}

/** 列出所有 localStorage 中的图文件 */
export async function listFilesHarmony(): Promise<{ name: string; kind: 'file' | 'directory'; children: any[] }[]> {
  const files: { name: string; kind: 'file' | 'directory'; children: any[] }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      const name = key.slice(STORAGE_PREFIX.length);
      if (name === 'demo') continue; // demo 始终存在，单独处理
      files.push({ name, kind: 'file', children: [] });
    }
  }
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

/** 从 localStorage 读取图数据 */
export async function readFileHarmony(fileName: string): Promise<GraphData | null> {
  try {
    const raw = localStorage.getItem(storageKey(fileName));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 写入图数据到 localStorage */
export async function writeFileHarmony(fileName: string, data: GraphData): Promise<boolean> {
  try {
    localStorage.setItem(storageKey(fileName), JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

/** 从 localStorage 删除图文件 */
export async function deleteFileHarmony(fileName: string): Promise<boolean> {
  try {
    localStorage.removeItem(storageKey(fileName));
    return true;
  } catch {
    return false;
  }
}

/**
 * 处理用户选取的 JSON 文件：写入 localStorage。
 * 供设置面板内嵌 <input type="file"> 的 change 事件调用。
 */
export async function importFilesHarmony(files: FileList): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name.endsWith('.json') ? file.name : file.name + '.json';
    try {
      const text = await file.text();
      localStorage.setItem(storageKey(name), text);
    } catch (e) {
      console.error('HarmonyOS import failed:', name, e);
    }
  }
}

/**
 * 创建文件导入控件（通过 <input type="file"> 导入 JSON 到 localStorage）
 * 返回 { label } 供设置面板显示为"导入文件"按钮
 */
export function createHarmonyFileImporter(onDone: () => void): { label: HTMLElement } {
  const id = 'fg-harmony-importer-' + Date.now();
  const input = document.createElement('input');
  input.type = 'file';
  input.id = id;
  input.accept = '.json,application/json';
  input.multiple = true;
  input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';

  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = '导入文件';
  label.style.cssText = 'display:inline-block;cursor:pointer;';

  document.body.appendChild(input);

  // 兜底：部分 WebView 不支持 label-for 触发隐藏 input
  // 加 pointerdown 直接调 input.click()（用户手势上下文内有效）
  label.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.click();
  });

  input.addEventListener('change', async () => {
    const files = input.files;
    if (!files || files.length === 0) { onDone(); return; }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.endsWith('.json') ? file.name : file.name + '.json';
      try {
        const text = await file.text();
        localStorage.setItem(storageKey(name), text);
      } catch (e) {
        console.error('HarmonyOS import failed:', name, e);
      }
    }
    input.value = '';
    onDone();
  });

  return { label };
}
