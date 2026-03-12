import chalk from 'chalk';
import { loadPendingSuggestions } from '../../learners/index.js';
import { Preference, Pattern, Workflow } from '../../types/index.js';

/**
 * review 命令
 * 查看待审批的建议
 */
export async function reviewCommand(): Promise<void> {
  console.log(chalk.bold.cyan('\n📋 待审批建议\n'));

  const suggestions = await loadPendingSuggestions();
  const pending = suggestions.filter((s) => s.status === 'pending');

  if (pending.length === 0) {
    console.log(chalk.gray('暂无待审批建议\n'));
    console.log(chalk.gray('运行 ') + chalk.cyan('claude-evolution analyze --now') + chalk.gray(' 开始分析\n'));
    return;
  }

  console.log(chalk.bold(`共 ${pending.length} 条待审批建议:\n`));

  // 按类型分组
  const byType = new Map<string, typeof pending>();
  for (const suggestion of pending) {
    if (!byType.has(suggestion.type)) {
      byType.set(suggestion.type, []);
    }
    byType.get(suggestion.type)!.push(suggestion);
  }

  // 显示每种类型的建议
  for (const [type, items] of byType) {
    console.log(chalk.bold.yellow(`\n## ${formatType(type)}\n`));

    for (const suggestion of items) {
      displaySuggestion(suggestion);
    }
  }

  console.log(chalk.bold('\n操作:'));
  console.log(chalk.cyan('  claude-evolution approve <id>  ') + chalk.gray('# 批准建议'));
  console.log(chalk.cyan('  claude-evolution reject <id>   ') + chalk.gray('# 拒绝建议'));
  console.log(chalk.cyan('  claude-evolution approve all   ') + chalk.gray('# 批准所有建议\n'));
}

/**
 * 显示单个建议
 */
function displaySuggestion(suggestion: any): void {
  const { id, type, item } = suggestion;

  console.log(chalk.bold(`ID: ${chalk.cyan(id.slice(0, 8))}`));

  if (type === 'preference') {
    const pref = item as Preference;
    console.log(`  类型: ${pref.type}`);
    console.log(`  描述: ${pref.description}`);
    console.log(`  置信度: ${chalk.green((pref.confidence * 100).toFixed(0) + '%')}`);
    console.log(`  频率: ${pref.frequency} 次`);
  } else if (type === 'pattern') {
    const pattern = item as Pattern;
    console.log(`  问题: ${pattern.problem}`);
    console.log(`  解决方案: ${pattern.solution}`);
    console.log(`  置信度: ${chalk.green((pattern.confidence * 100).toFixed(0) + '%')}`);
    console.log(`  出现: ${pattern.occurrences} 次`);
  } else if (type === 'workflow') {
    const workflow = item as Workflow;
    console.log(`  名称: ${workflow.name}`);
    console.log(`  步骤: ${workflow.steps.length} 步`);
    console.log(`  置信度: ${chalk.green((workflow.confidence * 100).toFixed(0) + '%')}`);
    console.log(`  频率: ${workflow.frequency} 次`);
  }

  console.log('');
}

/**
 * 格式化类型名称
 */
function formatType(type: string): string {
  const map: Record<string, string> = {
    preference: '用户偏好',
    pattern: '问题模式',
    workflow: '工作流程',
  };
  return map[type] || type;
}
