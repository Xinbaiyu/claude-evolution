import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config, ConfigSchema, DEFAULT_CONFIG } from './schema.js';

/**
 * 获取 claude-evolution 根目录
 */
export function getEvolutionDir(): string {
  // Support environment variable override for testing
  return process.env.CLAUDE_EVOLUTION_DIR || path.join(os.homedir(), '.claude-evolution');
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

  // 迁移 6: 添加 learning 配置（如果不存在）
  if (!migrated.learning) {
    migrated.learning = DEFAULT_CONFIG.learning;
  }

  // 迁移 7: 确保 learning 子字段存在
  if (migrated.learning) {
    if (!migrated.learning.capacity) {
      migrated.learning.capacity = DEFAULT_CONFIG.learning!.capacity;
    }
    if (!migrated.learning.decay) {
      migrated.learning.decay = DEFAULT_CONFIG.learning!.decay;
    }
    if (!migrated.learning.promotion) {
      migrated.learning.promotion = DEFAULT_CONFIG.learning!.promotion;
    }
    if (!migrated.learning.deletion) {
      migrated.learning.deletion = DEFAULT_CONFIG.learning!.deletion;
    }
    if (!migrated.learning.retention) {
      migrated.learning.retention = DEFAULT_CONFIG.learning!.retention;
    }

    // 迁移 10: 添加 extractObservations 字段（默认关闭）
    if (migrated.learning.extractObservations === undefined) {
      migrated.learning.extractObservations = DEFAULT_CONFIG.learning!.extractObservations;
    }

    // 迁移 8: 确保 learning.capacity 结构正确(active/context 分离)
    if (migrated.learning.capacity) {
      // 如果 capacity 还是旧的扁平结构,转换为嵌套结构
      if (!migrated.learning.capacity.active && migrated.learning.capacity.targetSize !== undefined) {
        const oldCapacity = migrated.learning.capacity;
        migrated.learning.capacity = {
          active: {
            targetSize: oldCapacity.targetSize ?? DEFAULT_CONFIG.learning!.capacity.active.targetSize,
            maxSize: oldCapacity.maxSize ?? DEFAULT_CONFIG.learning!.capacity.active.maxSize,
            minSize: oldCapacity.minSize ?? DEFAULT_CONFIG.learning!.capacity.active.minSize,
          },
          context: DEFAULT_CONFIG.learning!.capacity.context,
        };
      }

      // 确保 active 和 context 子对象存在
      if (!migrated.learning.capacity.active) {
        migrated.learning.capacity.active = DEFAULT_CONFIG.learning!.capacity.active;
      }
      if (!migrated.learning.capacity.context) {
        migrated.learning.capacity.context = DEFAULT_CONFIG.learning!.capacity.context;
      }

      // 迁移 9: 验证并修正 capacity 配置(targetSize ≤ maxSize)
      const activeConfig = migrated.learning.capacity.active;
      if (activeConfig.targetSize > activeConfig.maxSize) {
        console.warn(
          `[Config Migration] Active Pool targetSize (${activeConfig.targetSize}) > maxSize (${activeConfig.maxSize}), setting both to maxSize`
        );
        activeConfig.targetSize = activeConfig.maxSize;
      }

      const contextConfig = migrated.learning.capacity.context;
      if (contextConfig.targetSize > contextConfig.maxSize) {
        console.warn(
          `[Config Migration] Context Pool targetSize (${contextConfig.targetSize}) > maxSize (${contextConfig.maxSize}), setting both to maxSize`
        );
        contextConfig.targetSize = contextConfig.maxSize;
      }
    }
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
