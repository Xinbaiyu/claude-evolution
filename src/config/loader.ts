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
    // 使用 Zod 验证和填充默认值
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    console.error('配置文件解析失败,使用默认配置:', error);
    return DEFAULT_CONFIG;
  }
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
