import fs from 'fs-extra';
import path from 'path';

/**
 * 展开用户目录路径
 */
export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return path.join(process.env.HOME || '', filepath.slice(2));
  }
  return filepath;
}

/**
 * 创建带时间戳的备份文件
 */
export async function createBackup(
  sourcePath: string,
  backupDir: string
): Promise<string> {
  await fs.ensureDir(backupDir);

  const filename = path.basename(sourcePath);
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const backupPath = path.join(backupDir, `${filename}.${timestamp}`);

  await fs.copy(sourcePath, backupPath);
  return backupPath;
}

/**
 * 清理旧备份,只保留最新 N 个
 */
export async function cleanupOldBackups(
  backupDir: string,
  maxBackups: number
): Promise<void> {
  if (!(await fs.pathExists(backupDir))) {
    return;
  }

  const files = await fs.readdir(backupDir);
  const backupFiles = files
    .filter((f) => f.includes('.'))
    .map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  // 删除超出数量的旧备份
  for (let i = maxBackups; i < backupFiles.length; i++) {
    await fs.remove(backupFiles[i].path);
  }
}

/**
 * 安全地写入文件(先写临时文件再重命名)
 */
export async function safeWriteFile(
  filepath: string,
  content: string
): Promise<void> {
  const tempPath = `${filepath}.tmp`;
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.move(tempPath, filepath, { overwrite: true });
}

/**
 * 读取 JSON 文件,不存在则返回默认值
 */
export async function readJSONWithDefault<T>(
  filepath: string,
  defaultValue: T
): Promise<T> {
  if (!(await fs.pathExists(filepath))) {
    return defaultValue;
  }
  try {
    return await fs.readJSON(filepath);
  } catch {
    return defaultValue;
  }
}
