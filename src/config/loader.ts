import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config, ConfigSchema, DEFAULT_CONFIG } from './schema.js';

/**
 * 获取 claude-evolution 根目录
 */
export function getEvolutionDir(): string {
  return path.join(os.homedir(), '.claude-evolution');
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  return path.join(getEvolutionDir(), 'config.json');
}

/**
 * 加载配置
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();

  // 如果配置文件不存在,返回默认配置
  if (!(await fs.pathExists(configPath))) {
    return DEFAULT_CONFIG;
  }

  try {
    const rawConfig = await fs.readJSON(configPath);

    // 执行配置迁移
    const migratedConfig = migrateConfig(rawConfig);

    // 使用 Zod 验证和填充默认值
    return ConfigSchema.parse(migratedConfig);
  } catch (error) {
    console.error('配置文件解析失败,使用默认配置:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 配置迁移 - 处理旧版本配置向新版本的兼容
 */
function migrateConfig(oldConfig: any): any {
  const migrated = { ...oldConfig };

  // 迁移 1: scheduler.interval 从 enum 改为 string
  if (migrated.scheduler && typeof migrated.scheduler.interval === 'string') {
    // 如果是旧的 enum 值，保持不变
    // 新值会直接兼容
  }

  // 迁移 2: 添加 daemon 配置（如果不存在）
  if (!migrated.daemon) {
    migrated.daemon = DEFAULT_CONFIG.daemon;
  }

  // 迁移 3: 添加 webUI 配置（如果不存在）
  if (!migrated.webUI) {
    migrated.webUI = DEFAULT_CONFIG.webUI;
  }

  // 迁移 4: 确保 daemon.logRotation 存在
  if (migrated.daemon && !migrated.daemon.logRotation) {
    migrated.daemon.logRotation = DEFAULT_CONFIG.daemon!.logRotation;
  }

  // 迁移 5: 确保 webUI.corsOrigins 存在
  if (migrated.webUI && !migrated.webUI.corsOrigins) {
    migrated.webUI.corsOrigins = DEFAULT_CONFIG.webUI!.corsOrigins;
  }

  return migrated;
}

/**
 * 保存配置
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const evolutionDir = getEvolutionDir();

  // 确保目录存在
  await fs.ensureDir(evolutionDir);

  // 验证配置
  const validConfig = ConfigSchema.parse(config);

  // 保存配置
  await fs.writeJSON(configPath, validConfig, { spaces: 2 });
}

/**
 * 更新配置中的某个字段
 */
export async function updateConfigField(
  fieldPath: string,
  value: any
): Promise<void> {
  const config = await loadConfig();

  // 使用点号分隔的路径更新嵌套字段
  const keys = fieldPath.split('.');
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      throw new Error(`配置路径不存在: ${fieldPath}`);
    }
    current = current[keys[i]];
  }

  const lastKey = keys[keys.length - 1];
  if (!(lastKey in current)) {
    throw new Error(`配置路径不存在: ${fieldPath}`);
  }

  current[lastKey] = value;

  // 保存更新后的配置
  await saveConfig(config);
}
