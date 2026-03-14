import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * macOS LaunchAgent 管理
 */

const PLIST_LABEL = 'com.claude-evolution';
const PLIST_FILENAME = `${PLIST_LABEL}.plist`;

/**
 * 获取 LaunchAgent plist 文件路径
 */
export function getPlistPath(): string {
  return path.join(homedir(), 'Library/LaunchAgents', PLIST_FILENAME);
}

/**
 * 获取可执行文件路径
 */
function getExecutablePath(): string {
  // 尝试查找全局安装的 claude-evolution
  try {
    const { execSync } = require('child_process');
    const result = execSync('which claude-evolution', { encoding: 'utf8' }).trim();
    if (result) {
      return result;
    }
  } catch (error) {
    // 如果 which 失败，使用默认路径
  }

  // 默认 npm 全局安装路径
  const defaultPath = '/usr/local/bin/claude-evolution';
  return defaultPath;
}

/**
 * 生成 LaunchAgent plist XML 内容
 */
export function generatePlistContent(options: {
  executablePath?: string;
  port?: number;
  logPath?: string;
}): string {
  const execPath = options.executablePath || getExecutablePath();
  const port = options.port || 10010;
  const evolutionDir = path.join(homedir(), '.claude-evolution');
  const logPath = options.logPath || path.join(evolutionDir, 'logs/launchd.log');
  const errorLogPath = path.join(evolutionDir, 'logs/launchd-error.log');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
    <string>start</string>
    <string>--daemon</string>
    <string>--port</string>
    <string>${port}</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
    <key>Crashed</key>
    <true/>
  </dict>

  <key>StandardOutPath</key>
  <string>${logPath}</string>

  <key>StandardErrorPath</key>
  <string>${errorLogPath}</string>

  <key>WorkingDirectory</key>
  <string>${homedir()}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>ThrottleInterval</key>
  <integer>60</integer>
</dict>
</plist>
`;
}

/**
 * 检查 LaunchAgent 是否已安装
 */
export async function isInstalled(): Promise<boolean> {
  const plistPath = getPlistPath();
  return await fs.pathExists(plistPath);
}

/**
 * 检查 LaunchAgent 是否正在运行
 */
export async function isLoaded(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('launchctl list');
    return stdout.includes(PLIST_LABEL);
  } catch (error) {
    return false;
  }
}

/**
 * 安装 LaunchAgent
 */
export async function install(options: {
  executablePath?: string;
  port?: number;
  autoLoad?: boolean;
}): Promise<void> {
  const plistPath = getPlistPath();

  // 1. 检查是否已安装
  if (await isInstalled()) {
    throw new Error('LaunchAgent already installed. Use uninstall first.');
  }

  // 2. 确保 LaunchAgents 目录存在
  const launchAgentsDir = path.dirname(plistPath);
  await fs.ensureDir(launchAgentsDir);

  // 3. 确保日志目录存在
  const evolutionDir = path.join(homedir(), '.claude-evolution');
  await fs.ensureDir(path.join(evolutionDir, 'logs'));

  // 4. 生成并写入 plist 文件
  const plistContent = generatePlistContent({
    executablePath: options.executablePath,
    port: options.port,
  });

  await fs.writeFile(plistPath, plistContent, 'utf8');

  // 5. 设置正确的权限
  await fs.chmod(plistPath, 0o644);

  // 6. 自动加载（如果指定）
  if (options.autoLoad !== false) {
    await load();
  }
}

/**
 * 卸载 LaunchAgent
 */
export async function uninstall(): Promise<void> {
  const plistPath = getPlistPath();

  // 1. 检查是否已安装
  if (!(await isInstalled())) {
    throw new Error('LaunchAgent not installed');
  }

  // 2. 如果正在运行，先卸载
  if (await isLoaded()) {
    await unload();
  }

  // 3. 删除 plist 文件
  await fs.remove(plistPath);
}

/**
 * 加载 LaunchAgent (启用自启动)
 */
export async function load(): Promise<void> {
  const plistPath = getPlistPath();

  if (!(await isInstalled())) {
    throw new Error('LaunchAgent not installed');
  }

  if (await isLoaded()) {
    throw new Error('LaunchAgent already loaded');
  }

  try {
    await execAsync(`launchctl load "${plistPath}"`);
  } catch (error) {
    throw new Error(
      `Failed to load LaunchAgent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 卸载 LaunchAgent (禁用自启动，但不删除 plist)
 */
export async function unload(): Promise<void> {
  const plistPath = getPlistPath();

  if (!(await isLoaded())) {
    // 已经卸载了，不报错
    return;
  }

  try {
    await execAsync(`launchctl unload "${plistPath}"`);
  } catch (error) {
    throw new Error(
      `Failed to unload LaunchAgent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 启动服务（立即启动，不等重启）
 */
export async function start(): Promise<void> {
  if (!(await isLoaded())) {
    throw new Error('LaunchAgent not loaded');
  }

  try {
    await execAsync(`launchctl start ${PLIST_LABEL}`);
  } catch (error) {
    throw new Error(
      `Failed to start service: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 停止服务
 */
export async function stop(): Promise<void> {
  if (!(await isLoaded())) {
    throw new Error('LaunchAgent not loaded');
  }

  try {
    await execAsync(`launchctl stop ${PLIST_LABEL}`);
  } catch (error) {
    throw new Error(
      `Failed to stop service: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 获取服务状态
 */
export async function getStatus(): Promise<{
  installed: boolean;
  loaded: boolean;
  plistPath: string;
}> {
  return {
    installed: await isInstalled(),
    loaded: await isLoaded(),
    plistPath: getPlistPath(),
  };
}
