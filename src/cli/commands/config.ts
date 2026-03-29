import chalk from 'chalk';
import { loadConfig, updateConfigField } from '../../config/index.js';

/**
 * config 命令
 * 配置管理
 */

/**
 * 列出当前配置
 */
export async function configListCommand(): Promise<void> {
  console.log(chalk.bold.cyan('\n⚙️  当前配置\n'));

  const config = await loadConfig();

  // 学习阶段
  console.log(chalk.bold.yellow('学习阶段:'));
  console.log(`  观察期: ${config.learningPhases.observation.durationDays} 天`);
  console.log(`  建议期: ${config.learningPhases.suggestion.durationDays} 天`);
  console.log(`  自动应用阈值: ${config.learningPhases.automatic.confidenceThreshold}`);

  // 调度
  console.log(chalk.bold.yellow('\n调度:'));
  console.log(`  启用: ${config.scheduler.enabled ? '是' : '否'}`);
  console.log(`  间隔: ${config.scheduler.interval}`);
  if (config.scheduler.customCron) {
    console.log(`  自定义 cron: ${config.scheduler.customCron}`);
  }

  // LLM
  console.log(chalk.bold.yellow('\nLLM:'));
  console.log(`  当前提供商: ${config.llm.activeProvider}`);

  // 根据 activeProvider 显示对应配置
  const { activeProvider } = config.llm;
  switch (activeProvider) {
    case 'claude':
      console.log(`  模型: ${config.llm.claude.model}`);
      console.log(`  温度: ${config.llm.claude.temperature}`);
      console.log(`  最大 tokens: ${config.llm.claude.maxTokens}`);
      console.log(`  Prompt缓存: ${config.llm.claude.enablePromptCaching ? '启用' : '禁用'}`);
      break;
    case 'openai':
      console.log(`  模型: ${config.llm.openai.model}`);
      console.log(`  温度: ${config.llm.openai.temperature}`);
      console.log(`  最大 tokens: ${config.llm.openai.maxTokens}`);
      if (config.llm.openai.baseURL) {
        console.log(`  Base URL: ${config.llm.openai.baseURL}`);
      }
      break;
    case 'ccr':
      console.log(`  模型: ${config.llm.ccr.model}`);
      console.log(`  温度: ${config.llm.ccr.temperature}`);
      console.log(`  最大 tokens: ${config.llm.ccr.maxTokens}`);
      console.log(`  Base URL: ${config.llm.ccr.baseURL}`);
      break;
  }

  // HTTP API
  console.log(chalk.bold.yellow('\nHTTP API:'));
  console.log(`  Base URL: ${config.httpApi.baseUrl}`);
  console.log(`  最大重试: ${config.httpApi.maxRetries}`);
  console.log(`  超时设置: ${config.httpApi.timeout}ms`);

  // 过滤
  console.log(chalk.bold.yellow('\n数据过滤:'));
  console.log(`  敏感数据过滤: ${config.filters.enableSensitiveDataFilter ? '启用' : '禁用'}`);
  console.log(`  会话保留天数: ${config.filters.sessionRetentionDays}`);

  // MD 生成
  console.log(chalk.bold.yellow('\nMD 生成:'));
  console.log(`  最大字符数: ${config.mdGenerator.maxChars}`);
  console.log(`  包含元数据: ${config.mdGenerator.includeMetadata ? '是' : '否'}`);
  console.log(`  最大备份数: ${config.mdGenerator.maxBackups}\n`);
}

/**
 * 设置配置项
 */
export async function configSetCommand(field: string, value: string): Promise<void> {
  console.log(chalk.bold.cyan(`\n⚙️  设置配置: ${field} = ${value}\n`));

  try {
    // 类型转换
    let parsedValue: any = value;

    // 尝试解析为数字
    if (!isNaN(Number(value))) {
      parsedValue = Number(value);
    }
    // 尝试解析为布尔值
    else if (value === 'true' || value === 'false') {
      parsedValue = value === 'true';
    }

    await updateConfigField(field, parsedValue);

    console.log(chalk.green('✓ 配置已更新\n'));
    console.log(chalk.gray('运行 ') + chalk.cyan('claude-evolution config list') + chalk.gray(' 查看更新后的配置\n'));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ 设置失败: ${error.message}\n`));
    process.exit(1);
  }
}
