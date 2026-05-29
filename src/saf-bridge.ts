/**
 * SAF (Storage Access Framework) 原生桥接
 * 通过 Capacitor 插件 SafPlugin 调起 Android 原生目录选择器
 * 实现 Obsidian 式持久化目录读写
 */

interface FileEntry {
  name: string;
  kind: 'file' | 'directory';
  children: any[];
}

const plugin = () => (window as any).Capacitor?.Plugins?.SafPlugin;

export async function safPickDirectory(): Promise<{ path: string; name: string } | null> {
  const p = plugin();
  if (!p) return null;
  try {
    const result = await p.pickDirectory();
    return { path: result.path, name: result.name };
  } catch {
    return null;
  }
}

export async function safRestoreDirectory(): Promise<{ path: string; name: string } | null> {
  const p = plugin();
  if (!p) return null;
  try {
    const result = await p.restoreDirectory();
    return { path: result.path, name: result.name };
  } catch {
    return null;
  }
}

export async function safListFiles(): Promise<FileEntry[]> {
  const p = plugin();
  if (!p) return [];
  try {
    const result = await p.listFiles();
    return (result.files || []) as FileEntry[];
  } catch {
    return [];
  }
}

export async function safReadFile(fileName: string): Promise<string | null> {
  const p = plugin();
  if (!p) return null;
  try {
    const result = await p.readFile({ fileName });
    return result.data as string;
  } catch {
    return null;
  }
}

export async function safWriteFile(fileName: string, data: string): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    await p.writeFile({ fileName, data });
    return true;
  } catch {
    return false;
  }
}

export async function safDeleteFile(fileName: string): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    await p.deleteFile({ fileName });
    return true;
  } catch {
    return false;
  }
}

export function safIsAvailable(): boolean {
  return !!plugin();
}
