import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import * as Diff from 'diff';
import { getEvolutionDir } from '../../config/loader.js';
import { logger } from '../../utils/index.js';

/**
 * CLI diff 命令
 * 显示原始 CLAUDE.md 和进化后配置的差异
 */

interface DiffOptions {
  noColor?: boolean;
}

export async function diffCommand(options: DiffOptions = {}): Promise<void> {
  try {
    const { noColor = false } = options;

    const evolutionDir = getEvolutionDir();
    const sourceDir = path.join(evolutionDir, 'source');
    const learnedDir = path.join(evolutionDir, 'learned');

    // 检查是否已初始化
    if (!(await fs.pathExists(evolutionDir))) {
      console.log(chalk.yellow('\n⚠️  系统未初始化'));
      console.log(chalk.cyan('提示: 运行 `claude-evolution init` 初始化系统\n'));
      return;
    }

    // 读取原始 CLAUDE.md
    const originalPath = path.join(sourceDir, 'CLAUDE.md');
    let originalContent = '';

    if (await fs.pathExists(originalPath)) {
      originalContent = await fs.readFile(originalPath, 'utf-8');
    } else {
      console.log(chalk.yellow('\n⚠️  未找到原始 CLAUDE.md'));
      console.log(chalk.gray(`路径: ${originalPath}`));
    }

    // 读取进化后的配置文件
    const learnedFiles = await getLearnedFiles(learnedDir);

    if (learnedFiles.length === 0 && !originalContent) {
      console.log(chalk.yellow('\n⚠️  暂无配置文件'));
      console.log(chalk.cyan('提示: 运行 `claude-evolution analyze` 开始学习\n'));
      return;
    }

    // 合并进化后的配置
    let evolvedContent = '';
    for (const file of learnedFiles) {
      const filePath = path.join(learnedDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      evolvedContent += `\n# ${file}\n\n${content}\n`;
    }

    // 如果都为空
    if (!originalContent && !evolvedContent) {
      console.log(chalk.yellow('\n⚠️  暂无配置内容\n'));
      return;
    }

    // 计算差异
    const changes = Diff.diffLines(originalContent, evolvedContent);

    // 显示差异
    displayDiff(changes, noColor);

    // 显示统计
    displayDiffStats(changes);

    console.log('');

  } catch (error) {
    logger.error('生成差异失败:', error);
    throw error;
  }
}

/**
 * 获取 learned 目录下的所有文件
 */
async function getLearnedFiles(learnedDir: string): Promise<string[]> {
  if (!(await fs.pathExists(learnedDir))) {
    return [];
  }

  const files = await fs.readdir(learnedDir);
  return files.filter((file) => file.endsWith('.md'));
}

/**
 * 显示差异
 */
function displayDiff(changes: Diff.Change[], noColor: boolean): void {
  console.log('\n📝 配置差异\n');
  console.log(chalk.gray('━'.repeat(60)));

  if (changes.length === 0 || changes.every((c) => !c.added && !c.removed)) {
    console.log(chalk.gray('  无差异'));
    return;
  }

  for (const change of changes) {
    const lines = change.value.split('\n');

    for (const line of lines) {
      if (!line && change === changes[changes.length - 1]) {
        // 跳过最后的空行
        continue;
      }

      if (change.added) {
        // 新增行
        if (noColor) {
          console.log(`+ ${line}`);
        } else {
          console.log(chalk.green(`+ ${line}`));
        }
      } else if (change.removed) {
        // 删除行
        if (noColor) {
          console.log(`- ${line}`);
        } else {
          console.log(chalk.red(`- ${line}`));
        }
      } else {
        // 未改变的行（只显示前后几行）
        if (noColor) {
          console.log(`  ${line}`);
        } else {
          console.log(chalk.gray(`  ${line}`));
        }
      }
    }
  }

  console.log(chalk.gray('━'.repeat(60)));
}

/**
 * 显示差异统计
 */
function displayDiffStats(changes: Diff.Change[]): void {
  let addedLines = 0;
  let removedLines = 0;
  let unchangedLines = 0;

  for (const change of changes) {
    const lineCount = change.value.split('\n').filter((line) => line).length;

    if (change.added) {
      addedLines += lineCount;
    } else if (change.removed) {
      removedLines += lineCount;
    } else {
      unchangedLines += lineCount;
    }
  }

  console.log('\n📊 变更统计\n');

  if (addedLines > 0) {
    console.log(chalk.green(`  + ${addedLines} 行新增`));
  }

  if (removedLines > 0) {
    console.log(chalk.red(`  - ${removedLines} 行删除`));
  }

  if (unchangedLines > 0) {
    console.log(chalk.gray(`    ${unchangedLines} 行未变更`));
  }

  const totalChanges = addedLines + removedLines;
  if (totalChanges === 0) {
    console.log(chalk.gray('  无变更'));
  } else {
    console.log(chalk.bold(`\n  总计: ${totalChanges} 行变更`));
  }
}
