/**
 * Capacitor/WebView 文件系统模块（兼容 HarmonyOS）
 * 使用 @capacitor/filesystem 存储，使用 HTML 文件选择器导入
 */
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const WORK_DIR = 'graphs';

async function ensureWorkDir(): Promise<void> {
  try {
    await Filesystem.mkdir({ path: WORK_DIR, directory: Directory.Data, recursive: true });
  } catch {}
}

/**
 * 原生 Android 目录选择器 → 列出目录中 .json 文件并导入。
 * 使用 SAF (Storage Access Framework)，兼容华为/鸿蒙。
 */
export async function pickDirectoryAndImport(): Promise<number> {
  const dirResult = await FilePicker.pickDirectory();
  const dirPath = dirResult.path;
  if (!dirPath) return 0;

  // 列出目录中的 .json 文件
  let jsonFiles: { name: string; path: string }[] = [];
  try {
    // 尝试用 Filesystem 列出文件（路径可能是 content:// 或 file://）
    const listing = await Filesystem.readdir({ path: dirPath });
    jsonFiles = listing.files
      .filter(f => f.name.endsWith('.json'))
      .map(f => ({ name: f.name, path: dirPath + '/' + f.name }));
  } catch {
    // content:// URI 无法直接用 Filesystem 列出 → 回退 file picker
    console.warn('Cannot list directory via Filesystem, using file picker fallback');
    return -1; // 返回 -1 表示需要回退
  }

  // 读取并导入每个 .json 文件
  let imported = 0;
  await ensureWorkDir();
  for (const f of jsonFiles) {
    try {
      const result = await Filesystem.readFile({ path: f.path });
      const text = result.data as string;
      JSON.parse(text);
      await Filesystem.writeFile({
        path: `${WORK_DIR}/${f.name}`,
        data: text,
        directory: Directory.Data,
      });
      imported++;
    } catch (e) {
      console.error('import failed:', f.name, e);
    }
  }
  return imported;
}

/**
 * 处理用户选取的 JSON 文件：验证并写入 Capacitor Filesystem 存储。
 * 供设置面板内嵌 <input type="file"> 的 change 事件调用。
 */
export async function importFilesMobile(files: FileList): Promise<void> {
  await ensureWorkDir();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = file.name.endsWith('.json') ? file.name : file.name + '.json';
    try {
      const text = await file.text();
      JSON.parse(text); // 验证 JSON
      await Filesystem.writeFile({
        path: `${WORK_DIR}/${name}`,
        data: text,
        directory: Directory.Data,
      });
    } catch (e) {
      console.error('import failed:', name, e);
    }
  }
}

/**
 * 创建文件导入控件（HTML fallback，用于鸿蒙等无 Capacitor 桥环境）。
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

  // 兜底：部分 WebView 不支持 label-for 触发隐藏 input
  // 加 pointerdown 直接调 input.click()（用户手势上下文内有效）
  label.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.click();
  });

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

/** 下载 APK 到外部存储并尝试安装 */
export async function downloadApk(url: string): Promise<void> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);

    let base64 = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, i + CHUNK);
      base64 += String.fromCharCode.apply(null, Array.from(slice));
    }
    base64 = btoa(base64);

    // 保存到应用外部存储目录
    await ensureWorkDir();
    const fileName = 'force-graph-update.apk';
    await Filesystem.writeFile({
      path: `${WORK_DIR}/${fileName}`,
      data: base64,
      directory: Directory.ExternalStorage,
    }).catch(() => {
      // ExternalStorage 可能不可用 → 回退 Data 目录
      return Filesystem.writeFile({
        path: `${WORK_DIR}/${fileName}`,
        data: base64,
        directory: Directory.Data,
      });
    });

    // 尝试原生安装
    const plugin = (window as any).Capacitor?.Plugins?.ApkInstaller;
    if (plugin) {
      await plugin.downloadAndInstall({ url, fileName });
      return;
    }

    // 回退：用下载 URL 在本窗口打开（WebView 会尝试下载/安装）
    window.open(url, '_self');
  } catch (e) {
    console.error('Download failed:', e);
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
