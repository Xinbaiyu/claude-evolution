import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Config } from '../config/index.js';
import { getEvolutionDir } from '../config/loader.js';
import { logger } from '../utils/index.js';
import { createBackup, cleanupOldBackups, safeWriteFile } from '../utils/file-utils.js';

/**
 * MD 配置生成器
 * 负责拼接 source/ 和 learned/ 目录的 MD 文件,生成最终的 CLAUDE.md
 */

/**
 * 生成 CLAUDE.md
 */
export async function generateCLAUDEmd(config: Config): Promise<void> {
  logger.info('开始生成 CLAUDE.md...');

  const evolutionDir = getEvolutionDir();
  const sourceDir = path.join(evolutionDir, 'source');
  const learnedDir = path.join(evolutionDir, 'learned');
  const outputPath = path.join(evolutionDir, 'output/CLAUDE.md');

  // 确保目录存在
  await fs.ensureDir(path.join(evolutionDir, 'output'));

  // 1. 读取所有源文件
  const sourceFiles = await getMarkdownFiles(sourceDir);
  logger.debug(`找到 ${sourceFiles.length} 个源文件`);

  // 2. 读取所有学习文件
  const learnedFiles = await getMarkdownFiles(learnedDir);
  logger.debug(`找到 ${learnedFiles.length} 个学习文件`);

  // 3. 拼接内容
  let output = '';

  // 添加元数据头
  if (config.mdGenerator.includeMetadata) {
    output += generateMetadata();
  }

  // 拼接 source 文件
  for (const file of sourceFiles) {
    const content = await fs.readFile(file, 'utf-8');
    output += content + '\n\n---\n\n';
  }

  // 拼接 learned 文件
  for (const file of learnedFiles) {
    const content = await fs.readFile(file, 'utf-8');
    output += content + '\n\n---\n\n';
  }

  // 添加尾注
  output += generateFooter();

  // 4. 检查字符限制
  if (output.length > config.mdGenerator.maxChars) {
    logger.warn(
      `警告: 生成的配置超过 ${config.mdGenerator.maxChars} 字符 ` +
        `(当前: ${output.length}),正在截断...`
    );
    output = truncateContent(output, config.mdGenerator.maxChars);
  }

  // 5. 备份现有文件
  if (config.mdGenerator.backupBeforeOverwrite && (await fs.pathExists(outputPath))) {
    const backupDir = path.join(evolutionDir, 'backups');
    await createBackup(outputPath, backupDir);
    await cleanupOldBackups(backupDir, config.mdGenerator.maxBackups);
    logger.debug('✓ 已创建备份');
  }

  // 6. 写入新文件
  await safeWriteFile(outputPath, output);
  logger.success(`✓ CLAUDE.md 已生成 (${output.length} 字符)`);

  // 7. 创建或更新软链接到 ~/.claude/CLAUDE.md
  await createSymlink(outputPath);
}

/**
 * 获取目录下的所有 Markdown 文件
 */
async function getMarkdownFiles(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const files = await fs.readdir(dir);
  const mdFiles = files
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f))
    .sort(); // 按字母顺序排序

  return mdFiles;
}

/**
 * 生成元数据头部
 */
function generateMetadata(): string {
  return `# Claude Code 配置

> 自动生成于: ${new Date().toISOString()}
> 版本: claude-evolution v0.1.0
> 此文件由系统自动生成,请勿手动编辑

---

`;
}

/**
 * 生成尾注
 */
function generateFooter(): string {
  return `

---

## 关于此配置

此文件由 **claude-evolution** 自动生成和维护。

- **静态规则**: 来自 \`~/.claude-evolution/source/\` 目录
- **学习内容**: 来自 \`~/.claude-evolution/learned/\` 目录

如需修改静态规则,请编辑 source/ 目录中的文件。
学习内容由系统自动生成,可通过 \`claude-evolution review\` 命令审核。

更多信息: https://github.com/yourusername/claude-evolution
`;
}

/**
 * 截断内容以符合字符限制
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  // 保留 source/ 内容,截断 learned/ 内容
  const parts = content.split('---');
  let accumulated = '';
  const kept: string[] = [];

  for (const part of parts) {
    if (accumulated.length + part.length + 5 > maxChars) {
      // 达到限制
      break;
    }
    kept.push(part);
    accumulated += part + '\n---\n';
  }

  const truncated = kept.join('\n---\n');

  // 添加截断提示
  return (
    truncated +
    '\n\n---\n\n' +
    '⚠️ **注意**: 配置内容已被截断以符合字符限制。\n' +
    '部分学习内容可能未包含在此文件中。\n'
  );
}

/**
 * 创建软链接到 ~/.claude/CLAUDE.md
 */
async function createSymlink(sourcePath: string): Promise<void> {
  const targetPath = path.join(os.homedir(), '.claude/CLAUDE.md');

  try {
    // 检查目标是否已存在
    if (await fs.pathExists(targetPath)) {
      const stats = await fs.lstat(targetPath);

      if (stats.isSymbolicLink()) {
        // 是软链接,删除后重新创建
        await fs.remove(targetPath);
        logger.debug('已删除旧软链接');
      } else {
        // 是普通文件,备份后删除
        const backupPath = `${targetPath}.backup-${Date.now()}`;
        await fs.move(targetPath, backupPath);
        logger.warn(`已备份原文件到: ${backupPath}`);
      }
    }

    // 创建新软链接
    await fs.symlink(sourcePath, targetPath);
    logger.success('✓ 已创建软链接: ~/.claude/CLAUDE.md');
  } catch (error) {
    logger.error('创建软链接失败:', error);
    logger.warn('您可以手动将配置文件复制到 ~/.claude/CLAUDE.md');
  }
}

/**
 * 从学习结果写入到 learned/ 文件
 */
export async function writeLearnedContent(
  preferences: any[],
  patterns: any[],
  workflows: any[]
): Promise<void> {
  const evolutionDir = getEvolutionDir();
  const learnedDir = path.join(evolutionDir, 'learned');
  await fs.ensureDir(learnedDir);

  // 写入 preferences.md
  if (preferences.length > 0) {
    const content = formatPreferences(preferences);
    await fs.writeFile(path.join(learnedDir, 'preferences.md'), content, 'utf-8');
    logger.debug('✓ 已写入 preferences.md');
  }

  // 写入 solutions.md (patterns)
  if (patterns.length > 0) {
    const content = formatPatterns(patterns);
    await fs.writeFile(path.join(learnedDir, 'solutions.md'), content, 'utf-8');
    logger.debug('✓ 已写入 solutions.md');
  }

  // 写入 workflows.md
  if (workflows.length > 0) {
    const content = formatWorkflows(workflows);
    await fs.writeFile(path.join(learnedDir, 'workflows.md'), content, 'utf-8');
    logger.debug('✓ 已写入 workflows.md');
  }
}

/**
 * 格式化偏好为 Markdown
 */
function formatPreferences(preferences: any[]): string {
  let md = '# 学习的偏好\n\n';
  md += '> 此文件由系统自动生成,包含从历史会话中学习的用户偏好\n\n';

  const byType = new Map<string, any[]>();
  for (const pref of preferences) {
    const type = pref.type || 'other';
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(pref);
  }

  for (const [type, prefs] of byType) {
    md += `## ${capitalizeFirst(type)}\n\n`;
    for (const pref of prefs) {
      md += `- **${pref.description}**\n`;
      md += `  - 置信度: ${(pref.confidence * 100).toFixed(0)}%\n`;
      md += `  - 出现频率: ${pref.frequency} 次\n\n`;
    }
  }

  return md;
}

/**
 * 格式化模式为 Markdown
 */
function formatPatterns(patterns: any[]): string {
  let md = '# 学习的问题解决方案\n\n';
  md += '> 此文件由系统自动生成,包含重复出现的问题及其最佳解决方案\n\n';

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    md += `## ${i + 1}. ${pattern.problem}\n\n`;
    md += `**解决方案**: ${pattern.solution}\n\n`;
    md += `- 置信度: ${(pattern.confidence * 100).toFixed(0)}%\n`;
    md += `- 出现次数: ${pattern.occurrences} 次\n\n`;
    md += '---\n\n';
  }

  return md;
}

/**
 * 格式化工作流程为 Markdown
 */
function formatWorkflows(workflows: any[]): string {
  let md = '# 学习的工作流程\n\n';
  md += '> 此文件由系统自动生成,包含用户常用的操作流程\n\n';

  for (const workflow of workflows) {
    md += `## ${workflow.name}\n\n`;
    md += '**步骤**:\n\n';
    for (let i = 0; i < workflow.steps.length; i++) {
      md += `${i + 1}. ${workflow.steps[i]}\n`;
    }
    md += '\n';
    md += `- 置信度: ${(workflow.confidence * 100).toFixed(0)}%\n`;
    md += `- 使用频率: ${workflow.frequency} 次\n\n`;
    md += '---\n\n';
  }

  return md;
}

/**
 * 首字母大写
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
