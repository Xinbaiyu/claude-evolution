import chalk from 'chalk';
import {
  approveSuggestion,
  rejectSuggestion,
  loadPendingSuggestions,
  getSuggestion,
  getItemType,
} from '../../learners/index.js';
import { generateCLAUDEmd, writeLearnedContent } from '../../generators/index.js';
import { loadConfig } from '../../config/index.js';
import { logger } from '../../utils/index.js';

/**
 * approve 命令
 * 批准建议
 */
export async function approveCommand(id: string): Promise<void> {
  if (id === 'all') {
    await approveAllSuggestions();
    return;
  }

  console.log(chalk.bold.cyan(`\n✅ 批准建议: ${id.slice(0, 8)}...\n`));

  try {
    // 获取建议详情
    const suggestion = await getSuggestion(id);
    if (!suggestion) {
      console.error(chalk.red(`❌ 建议不存在: ${id}\n`));
      process.exit(1);
    }

    // 批准建议
    await approveSuggestion(id);

    // 写入到 learned/ 目录
    const type = getItemType(suggestion.item as any);
    if (type === 'preference') {
      await writeLearnedContent([suggestion.item], [], []);
    } else if (type === 'pattern') {
      await writeLearnedContent([], [suggestion.item], []);
    } else if (type === 'workflow') {
      await writeLearnedContent([], [], [suggestion.item]);
    }

    // 重新生成 CLAUDE.md
    const config = await loadConfig();
    await generateCLAUDEmd(config);

    console.log(chalk.green(`✓ 已批准并应用建议\n`));
    console.log(chalk.gray('已更新:'));
    console.log(chalk.cyan(`  ~/.claude-evolution/learned/\n`));
    console.log(chalk.cyan(`  ~/.claude-evolution/output/CLAUDE.md\n`));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ 批准失败: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * reject 命令
 * 拒绝建议
 */
export async function rejectCommand(id: string): Promise<void> {
  console.log(chalk.bold.yellow(`\n🚫 拒绝建议: ${id.slice(0, 8)}...\n`));

  try {
    // 获取建议详情
    const suggestion = await getSuggestion(id);
    if (!suggestion) {
      console.error(chalk.red(`❌ 建议不存在: ${id}\n`));
      process.exit(1);
    }

    // 拒绝建议
    await rejectSuggestion(id);

    console.log(chalk.green(`✓ 已拒绝建议\n`));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ 拒绝失败: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * 批准所有建议
 */
async function approveAllSuggestions(): Promise<void> {
  console.log(chalk.bold.cyan('\n✅ 批准所有建议\n'));

  const suggestions = await loadPendingSuggestions();
  const pending = suggestions.filter((s) => s.status === 'pending');

  if (pending.length === 0) {
    console.log(chalk.gray('暂无待审批建议\n'));
    return;
  }

  console.log(chalk.bold(`共 ${pending.length} 条建议待处理...\n`));

  let approved = 0;
  let failed = 0;

  for (const suggestion of pending) {
    try {
      await approveSuggestion(suggestion.id);

      // 写入到 learned/ 目录
      const type = getItemType(suggestion.item as any);
      if (type === 'preference') {
        await writeLearnedContent([suggestion.item], [], []);
      } else if (type === 'pattern') {
        await writeLearnedContent([], [suggestion.item], []);
      } else if (type === 'workflow') {
        await writeLearnedContent([], [], [suggestion.item]);
      }

      approved++;
      logger.success(`✓ 已批准: ${suggestion.id.slice(0, 8)}`);
    } catch (error: any) {
      failed++;
      logger.error(`✗ 失败: ${suggestion.id.slice(0, 8)} - ${error.message}`);
    }
  }

  // 重新生成 CLAUDE.md
  console.log(chalk.gray('\n正在重新生成 CLAUDE.md...'));
  const config = await loadConfig();
  await generateCLAUDEmd(config);

  console.log(chalk.bold.green(`\n✅ 完成: ${approved} 成功, ${failed} 失败\n`));
}
