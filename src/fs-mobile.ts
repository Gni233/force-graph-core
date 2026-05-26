/**
 * Android/Capacitor 文件系统模块
 * 使用 @capacitor/filesystem 和 @capawesome/capacitor-file-picker
 * 数据存储在应用私有目录，通过文件选择器导入/导出
 */
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

const WORK_DIR = 'graphs';

/** 确保工作目录存在 */
async function ensureWorkDir(): Promise<void> {
  try {
    await Filesystem.mkdir({ path: WORK_DIR, directory: Directory.Data, recursive: true });
  } catch {}
}

/** 请求文件权限并打开文件选择器，导入 .json 文件到应用数据目录 */
export async function openFolderMobile(): Promise<string | null> {
  try {
    // 运行时请求权限（Android 6.0+ / HarmonyOS 必须）
    try {
      const perm = await FilePicker.checkPermissions();
      if (perm.readExternalStorage !== 'granted') {
        const req = await FilePicker.requestPermissions();
        if (req.readExternalStorage !== 'granted') {
          console.error('文件权限被拒绝');
          return null;
        }
      }
    } catch {}

    const result = await FilePicker.pickFiles({
      limit: 0,
      types: ['application/json'],
      readData: true,
    });
    if (!result.files.length) return null;

    await ensureWorkDir();

    for (const file of result.files) {
      if (!file.name || !file.data) continue;
      const name = file.name.endsWith('.json') ? file.name : file.name + '.json';
      try {
        const text = atob(file.data);
        await Filesystem.writeFile({
          path: `${WORK_DIR}/${name}`,
          data: text,
          directory: Directory.Data,
        });
      } catch (e) {
        console.error('导入文件失败:', name, e);
      }
    }
    return WORK_DIR;
  } catch (e) {
    console.error('打开文件夹失败', e);
    return null;
  }
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

/** 读取图文件 */
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

/** 写入图文件 */
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
    console.error('写入文件失败', e);
    return false;
  }
}

/** 删除图文件 */
export async function deleteFileMobile(fileName: string): Promise<boolean> {
  try {
    await Filesystem.deleteFile({ path: `${WORK_DIR}/${fileName}`, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

/** 检测是否运行在 Capacitor 环境 */
export function isCapacitor(): boolean {
  return !!(window as any).Capacitor?.isNative?.();
}
