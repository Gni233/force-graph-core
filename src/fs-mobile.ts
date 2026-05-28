/**
 * Capacitor/WebView 文件系统模块（兼容 HarmonyOS）
 * 使用 @capacitor/filesystem 存储，使用 HTML 文件选择器导入
 */
import { Filesystem, Directory } from '@capacitor/filesystem';

const WORK_DIR = 'graphs';

async function ensureWorkDir(): Promise<void> {
  try {
    await Filesystem.mkdir({ path: WORK_DIR, directory: Directory.Data, recursive: true });
  } catch {}
}

/**
 * 创建文件导入控件。
 * 返回 { label, input } 两个元素：
 * - input 是隐藏的 <input type="file"> 加到 body
 * - label 是用 for+id 关联的可见按钮
 * 用户点击 label 时触发原生选择器（鸿蒙兼容）。
 */
export function createFileImporter(onDone: () => void): { label: HTMLElement; input: HTMLInputElement } {
  const id = 'fg-file-importer-' + Date.now();
  const input = document.createElement('input');
  input.type = 'file';
  input.id = id;
  input.accept = '.json,application/json';
  input.multiple = true;
  input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';

  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.style.cssText = 'display:inline-block;cursor:pointer;';

  // input 必须挂到 DOM 中（文件选择器要求）
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const files = input.files;
    if (!files || files.length === 0) { onDone(); return; }

    await ensureWorkDir();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.endsWith('.json') ? file.name : file.name + '.json';
      try {
        const text = await file.text();
        await Filesystem.writeFile({
          path: `${WORK_DIR}/${name}`,
          data: text,
          directory: Directory.Data,
        });
      } catch (e) {
        console.error('import failed:', name, e);
      }
    }
    input.value = ''; // 允许重复选择同一文件
    onDone();
  });

  return { label, input };
}

/** 列出工作目录下所有 .json 文件 */
export async function listFilesMobile(): Promise<{ name: string; kind: 'file' | 'directory'; children: any[] }[]> {
  await ensureWorkDir();
  try {
    const result = await Filesystem.readdir({ path: WORK_DIR, directory: Directory.Data });
    return result.files
      .filter(f => f.name.endsWith('.json'))
      .map(f => ({ name: f.name, kind: 'file' as const, children: [] }));
  } catch {
    return [];
  }
}

export async function readFileMobile(fileName: string): Promise<any | null> {
  try {
    const result = await Filesystem.readFile({
      path: `${WORK_DIR}/${fileName}`,
      directory: Directory.Data,
    });
    return JSON.parse(result.data as string);
  } catch {
    return null;
  }
}

export async function writeFileMobile(fileName: string, data: any): Promise<boolean> {
  try {
    await ensureWorkDir();
    await Filesystem.writeFile({
      path: `${WORK_DIR}/${fileName}`,
      data: JSON.stringify(data, null, 2),
      directory: Directory.Data,
    });
    return true;
  } catch (e) {
    console.error('write failed', e);
    return false;
  }
}

export async function deleteFileMobile(fileName: string): Promise<boolean> {
  try {
    await Filesystem.deleteFile({ path: `${WORK_DIR}/${fileName}`, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

/** 通过原生 Capacitor 插件后台下载并安装 APK */
export async function installApk(url: string): Promise<void> {
  const plugin = (window as any).Capacitor?.Plugins?.ApkInstaller;
  if (plugin) {
    try {
      await plugin.downloadAndInstall({ url, fileName: 'force-graph-update.apk' });
      return;
    } catch (e) {
      console.error('Native install failed, fallback:', e);
    }
  }
  // 回退到浏览器下载
  downloadApk(url);
}

/** 下载 APK 到浏览器（非 Capacitor 环境回退） */
export async function downloadApk(url: string): Promise<void> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'force-graph-update.apk';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch {
    window.open(url, '_blank');
  }
}

/** 下载最新 Release 的 APK 并安装 */
export async function downloadReleaseApk(): Promise<void> {
  try {
    const resp = await fetch('https://api.github.com/repos/Gni233/force-graph-core/releases/latest');
    const data = await resp.json();
    const apk = data.assets?.find((a: any) => a.name.endsWith('.apk'));
    if (apk) {
      // GitHub Release 中有 APK 附件（正式发布）
      await installApk(apk.browser_download_url);
      return;
    }
    // Release 中无 APK → 回退到仓库根目录的 ForceGraph.apk（开发构建）
    const rawUrl = 'https://raw.githubusercontent.com/Gni233/force-graph-core/main/ForceGraph.apk';
    await installApk(rawUrl);
  } catch {
    // 网络失败 → 打开 Releases 页面
    window.open('https://github.com/Gni233/force-graph-core/releases', '_blank');
  }
}

export function isCapacitor(): boolean {
  return !!(window as any).Capacitor?.isNative?.();
}
