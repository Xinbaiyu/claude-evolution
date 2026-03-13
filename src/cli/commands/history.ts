import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getEvolutionDir } from '../../config/loader.js';
import { logger } from '../../utils/index.js';
import type { Suggestion } from '../../types/index.js';

/**
 * CLI history 命令
 * 显示已批准和已拒绝的建议历史
 */

interface HistoryOptions {
  limit?: number;
  type?: 'approved' | 'rejected' | 'all';
}

export async function historyCommand(options: HistoryOptions = {}): Promise<void> {
  try {
    const { limit = 10, type = 'all' } = options;

    const evolutionDir = getEvolutionDir();
    const suggestionsDir = path.join(evolutionDir, 'suggestions');

    if (!(await fs.pathExists(suggestionsDir))) {
      console.log(chalk.yellow('\n⚠️  暂无历史记录'));
      console.log(chalk.cyan('提示: 运行 `claude-evolution analyze` 开始分析\n'));
      return;
    }

    // 读取历史记录
    const history: Array<Suggestion & { actionType: 'approved' | 'rejected' }> = [];

    // 读取已批准
    if (type === 'all' || type === 'approved') {
      const approvedPath = path.join(suggestionsDir, 'approved.json');
      if (await fs.pathExists(approvedPath)) {
        const approved: Suggestion[] = await fs.readJSON(approvedPath);
        approved.forEach((item) => {
          history.push({ ...item, actionType: 'approved' });
        });
      }
    }

    // 读取已拒绝
    if (type === 'all' || type === 'rejected') {
      const rejectedPath = path.join(suggestionsDir, 'rejected.json');
      if (await fs.pathExists(rejectedPath)) {
        const rejected: Suggestion[] = await fs.readJSON(rejectedPath);
        rejected.forEach((item) => {
          history.push({ ...item, actionType: 'rejected' });
        });
      }
    }

    if (history.length === 0) {
      console.log(chalk.yellow('\n⚠️  暂无历史记录'));
      return;
    }

    // 按时间倒序排列
    history.sort((a, b) => {
      const timeA = new Date(a.reviewedAt || a.createdAt).getTime();
      const timeB = new Date(b.reviewedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    // 限制数量
    const displayHistory = history.slice(0, limit);

    // 显示表格
    displayHistoryTable(displayHistory, type);

    // 显示统计
    const totalCount = history.length;
    if (totalCount > limit) {
      console.log(chalk.gray(`\n显示前 ${limit} 条，共 ${totalCount} 条记录`));
      console.log(chalk.cyan(`提示: 使用 --limit 参数查看更多记录`));
    } else {
      console.log(chalk.gray(`\n共 ${totalCount} 条记录`));
    }

    console.log('');

  } catch (error) {
    logger.error('读取历史记录失败:', error);
    throw error;
  }
}

/**
 * 显示历史记录表格
 */
function displayHistoryTable(
  history: Array<Suggestion & { actionType: 'approved' | 'rejected' }>,
  filterType: string
): void {
  const table = new Table({
    head: [
      chalk.bold('操作'),
      chalk.bold('类型'),
      chalk.bold('描述'),
      chalk.bold('置信度'),
      chalk.bold('时间'),
    ],
    colWidths: [10, 12, 40, 10, 20],
    wordWrap: true,
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const item of history) {
    const actionIcon = item.actionType === 'approved'
      ? chalk.green('✓ 批准')
      : chalk.red('✗ 拒绝');

    const typeLabel = getTypeLabel(item.type);
    const description = getDescription(item);
    const confidence = getConfidence(item);
    const time = formatTime(item.reviewedAt || item.createdAt);

    table.push([actionIcon, typeLabel, description, confidence, time]);
  }

  console.log('\n📜 历史记录\n');
  console.log(table.toString());
}

/**
 * 获取类型标签
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    preference: chalk.blue('偏好'),
    pattern: chalk.magenta('模式'),
    workflow: chalk.cyan('工作流'),
  };

  return labels[type] || type;
}

/**
 * 获取描述
 */
function getDescription(suggestion: Suggestion): string {
  const { type, item } = suggestion;

  if (type === 'preference') {
    const pref = item as any;
    return truncate(pref.description, 40);
  }

  if (type === 'pattern') {
    const pattern = item as any;
    return truncate(`${pattern.problem} → ${pattern.solution}`, 40);
  }

  if (type === 'workflow') {
    const workflow = item as any;
    const stepsCount = workflow.steps?.length || 0;
    return truncate(`${workflow.name} (${stepsCount} 步骤)`, 40);
  }

  return 'Unknown';
}

/**
 * 获取置信度
 */
function getConfidence(suggestion: Suggestion): string {
  const { item } = suggestion;
  const confidence = (item as any).confidence;

  if (confidence === undefined) {
    return '-';
  }

  const percentage = (confidence * 100).toFixed(0);
  const value = `${percentage}%`;

  if (confidence >= 0.9) {
    return chalk.green(value);
  } else if (confidence >= 0.7) {
    return chalk.yellow(value);
  } else {
    return chalk.gray(value);
  }
}

/**
 * 格式化时间
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString('zh-CN');
  } else if (diffDays > 0) {
    return `${diffDays} 天前`;
  } else if (diffHours > 0) {
    return `${diffHours} 小时前`;
  } else {
    return '刚刚';
  }
}

/**
 * 截断长文本
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}
