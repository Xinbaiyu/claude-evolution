import chalk from 'chalk';
import { runAnalysisPipeline } from '../../analyzers/index.js';
import { logger } from '../../utils/index.js';
import { loadConfig } from '../../config/index.js';

/**
 * analyze 命令
 * 手动触发分析流程
 */
export async function analyzeCommand(options: { now?: boolean }): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 开始分析会话数据...\n'));

  if (!options.now) {
    logger.warn('提示: 使用 --now 选项立即运行分析');
    return;
  }

  try {
    // 加载配置检查LLM设置
    const config = await loadConfig();

    // 如果未配置自定义baseURL,则需要ANTHROPIC_API_KEY
    if (!config.llm.baseURL && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('缺少 ANTHROPIC_API_KEY 环境变量。请设置: export ANTHROPIC_API_KEY=your-api-key\n或在配置文件中设置 llm.baseURL 使用本地代理');
    }

    // 运行分析流程
    await runAnalysisPipeline();

    console.log(chalk.bold.green('\n✅ 分析完成!\n'));
    console.log(chalk.bold('查看结果:'));
    console.log(chalk.cyan('  claude-evolution review  ') + chalk.gray('# 查看待审批建议'));
    console.log(chalk.cyan('  cat ~/.claude-evolution/output/CLAUDE.md  ') + chalk.gray('# 查看生成的配置\n'));
  } catch (error: any) {
    console.error(chalk.red('\n❌ 分析失败:\n'));
    console.error(chalk.red(error.message || error));

    if (error.message?.includes('MCP')) {
      console.log(chalk.yellow('\n提示: 请确保 claude-mem 已正确安装和配置'));
      console.log(chalk.gray('  检查: ~/.claude-mem/ 目录是否存在\n'));
    }

    // 重新抛出异常，让调用方处理
    throw error;
  }
}
