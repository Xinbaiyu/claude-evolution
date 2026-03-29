import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config, ConfigSchema, DEFAULT_CONFIG, ActiveProvider } from './schema.js';

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

  let backupPath: string | null = null;

  try {
    const rawConfig = await fs.readJSON(configPath);

    // 检测是否需要迁移
    const needsMigration = isOldConfigFormat(rawConfig);

    // 如果需要迁移，先备份
    if (needsMigration) {
      backupPath = await backupConfig(configPath);
    }

    // 执行配置迁移
    const migratedConfig = migrateConfig(rawConfig);

    // 使用 Zod 验证和填充默认值
    const validatedConfig = ConfigSchema.parse(migratedConfig);

    // 如果迁移成功且配置有变化，保存新配置
    if (needsMigration) {
      await fs.writeJSON(configPath, validatedConfig, { spaces: 2 });
      console.log('[Config Migration] 新配置已保存');
    }

    return validatedConfig;
  } catch (error) {
    console.error('[Config Migration] 配置文件解析或迁移失败:', error);

    // 如果有备份且迁移失败，尝试恢复
    if (backupPath) {
      try {
        await fs.copy(backupPath, configPath);
        console.error('[Config Migration] 已从备份恢复配置');
      } catch (restoreError) {
        console.error('[Config Migration] 恢复备份失败:', restoreError);
      }
    }

    // 返回默认配置
    console.log('[Config Migration] 使用默认配置');
    return DEFAULT_CONFIG;
  }
}

/**
 * 检测是否为旧的 LLM 配置格式
 */
function isOldConfigFormat(config: any): boolean {
  if (!config.llm) return false;

  // 检查是否存在旧的顶层字段
  return (
    'model' in config.llm ||
    'provider' in config.llm ||
    'temperature' in config.llm ||
    'maxTokens' in config.llm
  );
}

/**
 * 推断激活的提供商
 */
function inferActiveProvider(oldConfig: any): ActiveProvider {
  if (!oldConfig.llm) return 'claude';

  const { provider, baseURL } = oldConfig.llm;

  // 如果明确指定了 provider
  if (provider === 'openai') return 'openai';
  if (provider === 'anthropic' && !baseURL) return 'claude';

  // 如果有 baseURL，判断为 CCR 模式
  if (baseURL) return 'ccr';

  // 默认为 Claude
  return 'claude';
}

/**
 * 备份配置文件
 */
async function backupConfig(configPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = `${configPath}.backup-${timestamp}`;

  try {
    await fs.copy(configPath, backupPath);
    console.log(`[Config Migration] 配置已备份至: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('[Config Migration] 备份失败:', error);
    throw new Error('配置备份失败，迁移中止');
  }
}

/**
 * 迁移 LLM 配置从扁平结构到嵌套结构
 */
function migrateLLMConfig(oldConfig: any): any {
  if (!isOldConfigFormat(oldConfig)) {
    // 已经是新格式，无需迁移
    return oldConfig.llm;
  }

  console.log('[Config Migration] 检测到旧的 LLM 配置格式，开始迁移...');

  const oldLLM = oldConfig.llm;
  const activeProvider = inferActiveProvider(oldConfig);

  console.log(`[Config Migration] 推断当前激活提供商: ${activeProvider}`);

  // 创建新的嵌套配置结构
  const newLLM: any = {
    activeProvider,
    claude: DEFAULT_CONFIG.llm.claude,
    openai: DEFAULT_CONFIG.llm.openai,
    ccr: DEFAULT_CONFIG.llm.ccr,
  };

  // 迁移当前激活提供商的配置
  switch (activeProvider) {
    case 'claude':
      newLLM.claude = {
        model: oldLLM.model || DEFAULT_CONFIG.llm.claude.model,
        temperature: oldLLM.temperature ?? DEFAULT_CONFIG.llm.claude.temperature,
        maxTokens: oldLLM.maxTokens ?? DEFAULT_CONFIG.llm.claude.maxTokens,
        enablePromptCaching: oldLLM.enablePromptCaching ?? DEFAULT_CONFIG.llm.claude.enablePromptCaching,
        apiVersion: oldLLM.anthropic?.apiVersion,
      };
      break;

    case 'openai':
      newLLM.openai = {
        model: oldLLM.model || DEFAULT_CONFIG.llm.openai.model,
        temperature: oldLLM.temperature ?? DEFAULT_CONFIG.llm.openai.temperature,
        maxTokens: oldLLM.maxTokens ?? DEFAULT_CONFIG.llm.openai.maxTokens,
        baseURL: oldLLM.baseURL,
        apiKey: oldLLM.openai?.apiKey,
        organization: oldLLM.openai?.organization,
      };
      break;

    case 'ccr':
      newLLM.ccr = {
        model: oldLLM.model || DEFAULT_CONFIG.llm.ccr.model,
        temperature: oldLLM.temperature ?? DEFAULT_CONFIG.llm.ccr.temperature,
        maxTokens: oldLLM.maxTokens ?? DEFAULT_CONFIG.llm.ccr.maxTokens,
        baseURL: oldLLM.baseURL || DEFAULT_CONFIG.llm.ccr.baseURL,
      };
      break;
  }

  console.log('[Config Migration] LLM 配置迁移完成');
  console.log(`[Config Migration] - 激活提供商: ${activeProvider}`);
  console.log(`[Config Migration] - ${activeProvider} 模型: ${newLLM[activeProvider].model}`);

  return newLLM;
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

  // 迁移 11: 添加 reminders 配置（如果不存在）
  if (!migrated.reminders) {
    migrated.reminders = DEFAULT_CONFIG.reminders;
  }

  // 迁移 12: LLM 配置从扁平结构迁移到嵌套结构
  if (migrated.llm) {
    migrated.llm = migrateLLMConfig(migrated);
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
