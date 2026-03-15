/**
 * CLAUDE.md Generator
 *
 * Generates CLAUDE.md from promoted observations in context.json
 */

import fs from 'fs-extra';
import path from 'path';
import { getEvolutionDir } from '../config/loader.js';
import { logger } from '../utils/index.js';
import type { ObservationWithMetadata } from '../types/learning.js';
import type { Preference, Pattern, Workflow } from '../types/index.js';

/**
 * Get output file path for CLAUDE.md
 */
export function getClaudeMdPath(): string {
  const evolutionDir = getEvolutionDir();
  return path.join(evolutionDir, 'output', 'CLAUDE.md');
}

/**
 * Group observations by type
 */
export function groupObservationsByType(observations: ObservationWithMetadata[]): {
  preferences: ObservationWithMetadata[];
  patterns: ObservationWithMetadata[];
  workflows: ObservationWithMetadata[];
} {
  return {
    preferences: observations.filter(obs => obs.type === 'preference'),
    patterns: observations.filter(obs => obs.type === 'pattern'),
    workflows: observations.filter(obs => obs.type === 'workflow'),
  };
}

/**
 * Generate markdown for preferences section
 */
export function generatePreferencesSection(observations: ObservationWithMetadata[]): string {
  if (observations.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## 用户偏好',
    '',
    '以下偏好已从历史会话中自动学习：',
    '',
  ];

  // Group preferences by category (if available in item.type)
  const byCategory = new Map<string, ObservationWithMetadata[]>();

  observations.forEach(obs => {
    const pref = obs.item as Preference;
    const category = pref.type || '其他';

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(obs);
  });

  // Generate sections for each category
  Array.from(byCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, prefs]) => {
      lines.push(`### ${category}`);
      lines.push('');

      prefs
        .sort((a, b) => b.mentions - a.mentions) // Sort by mentions (most frequent first)
        .forEach(obs => {
          const pref = obs.item as Preference;
          lines.push(`- **${pref.description}**`);

          if (pref.evidence && pref.evidence.length > 0) {
            const evidenceCount = pref.evidence.length;
            lines.push(`  - 观察到 ${obs.mentions} 次，来自 ${evidenceCount} 个会话`);
          }

          lines.push('');
        });
    });

  return lines.join('\n');
}

/**
 * Generate markdown for patterns section
 */
export function generatePatternsSection(observations: ObservationWithMetadata[]): string {
  if (observations.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## 常见模式',
    '',
    '以下问题解决模式已从历史会话中识别：',
    '',
  ];

  observations
    .sort((a, b) => b.mentions - a.mentions)
    .forEach((obs, index) => {
      const pattern = obs.item as Pattern;

      lines.push(`### ${index + 1}. ${pattern.problem}`);
      lines.push('');
      lines.push(`**解决方案**: ${pattern.solution}`);
      lines.push('');

      if (pattern.evidence && pattern.evidence.length > 0) {
        const evidenceCount = pattern.evidence.length;
        lines.push(`*出现 ${obs.mentions} 次，来自 ${evidenceCount} 个会话*`);
        lines.push('');
      }
    });

  return lines.join('\n');
}

/**
 * Generate markdown for workflows section
 */
export function generateWorkflowsSection(observations: ObservationWithMetadata[]): string {
  if (observations.length === 0) {
    return '';
  }

  const lines: string[] = [
    '## 工作流程',
    '',
    '以下工作流程已从历史会话中学习：',
    '',
  ];

  observations
    .sort((a, b) => b.mentions - a.mentions)
    .forEach(obs => {
      const workflow = obs.item as Workflow;

      lines.push(`### ${workflow.name}`);
      lines.push('');

      if (workflow.steps && workflow.steps.length > 0) {
        workflow.steps.forEach((step, index) => {
          lines.push(`${index + 1}. ${step}`);
        });
        lines.push('');
      }

      if (workflow.evidence && workflow.evidence.length > 0) {
        const evidenceCount = workflow.evidence.length;
        lines.push(`*使用 ${obs.mentions} 次，来自 ${evidenceCount} 个会话*`);
        lines.push('');
      }
    });

  return lines.join('\n');
}

/**
 * Load and merge source files from source directory
 */
async function loadSourceFiles(): Promise<string> {
  const evolutionDir = getEvolutionDir();
  const sourceDir = path.join(evolutionDir, 'source');

  try {
    // Check if source directory exists
    if (!(await fs.pathExists(sourceDir))) {
      logger.debug('Source directory not found, skipping source file inclusion');
      return '';
    }

    // Read all .md files
    const files = await fs.readdir(sourceDir);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort((a, b) => {
      // CORE.md should come before CODING.md and other files
      if (a.startsWith('CORE')) return -1;
      if (b.startsWith('CORE')) return 1;
      // Otherwise sort alphabetically
      return a.localeCompare(b);
    });

    if (mdFiles.length === 0) {
      return '';
    }

    // Read and concatenate all source files
    const contents: string[] = [];
    for (const file of mdFiles) {
      const filePath = path.join(sourceDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      contents.push(content.trim());
    }

    return contents.join('\n\n---\n\n');
  } catch (error) {
    logger.error('Failed to load source files', { error });
    return '';
  }
}

/**
 * Generate complete CLAUDE.md content
 */
export function generateClaudeMdContent(
  observations: ObservationWithMetadata[],
  sourceContent?: string
): string {
  const grouped = groupObservationsByType(observations);

  const lines: string[] = [
    '# Claude Code 配置',
    '',
    `> 自动生成于: ${new Date().toISOString()}`,
    '> 版本: claude-evolution v0.1.0',
    '> 此文件由系统自动生成,请勿手动编辑',
    '',
    '---',
    '',
  ];

  // Add source file content first (static rules)
  if (sourceContent && sourceContent.trim()) {
    lines.push(sourceContent.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Add learned content header
  if (observations.length > 0) {
    lines.push('# 学习的偏好');
    lines.push('');
    lines.push('> 此文件由系统自动生成,包含从历史会话中学习的用户偏好');
    lines.push('');

    const stats = [
      `- 总计: ${observations.length} 个已学习项目`,
      `- 偏好: ${grouped.preferences.length} 项`,
      `- 模式: ${grouped.patterns.length} 项`,
      `- 工作流: ${grouped.workflows.length} 项`,
    ];

    lines.push(...stats);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Add sections
  const preferencesSection = generatePreferencesSection(grouped.preferences);
  const patternsSection = generatePatternsSection(grouped.patterns);
  const workflowsSection = generateWorkflowsSection(grouped.workflows);

  if (preferencesSection) {
    lines.push(preferencesSection);
  }

  if (patternsSection) {
    lines.push(patternsSection);
  }

  if (workflowsSection) {
    lines.push(workflowsSection);
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*此文件由 Claude Evolution 增量学习系统自动生成*');
  lines.push('');

  return lines.join('\n');
}

/**
 * Regenerate CLAUDE.md from context observations
 *
 * @param observations - Promoted observations from context.json
 * @returns Path to generated CLAUDE.md
 */
export async function regenerateClaudeMd(
  observations: ObservationWithMetadata[]
): Promise<string> {
  // Filter out ignored observations
  const activeObservations = observations.filter(
    obs => !obs.manualOverride || obs.manualOverride.action !== 'ignore'
  );

  logger.info('Regenerating CLAUDE.md from context observations', {
    totalObservations: observations.length,
    activeObservations: activeObservations.length,
    ignoredObservations: observations.length - activeObservations.length,
  });

  try {
    // Load source files first
    const sourceContent = await loadSourceFiles();
    logger.debug('Loaded source files', {
      hasContent: !!sourceContent,
      length: sourceContent.length,
    });

    // Generate content with source files included (only active observations)
    const content = generateClaudeMdContent(activeObservations, sourceContent);

    // Get output path
    const outputPath = getClaudeMdPath();

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Backup existing file if it exists
    if (await fs.pathExists(outputPath)) {
      const backupPath = `${outputPath}.backup`;
      await fs.copy(outputPath, backupPath);
      logger.debug(`Backed up existing CLAUDE.md to ${backupPath}`);
    }

    // Write new content
    await fs.writeFile(outputPath, content, 'utf8');

    logger.success(`Generated CLAUDE.md with ${activeObservations.length} observations`, {
      path: outputPath,
      ignored: observations.length - activeObservations.length,
    });

    return outputPath;
  } catch (error) {
    logger.error('Failed to regenerate CLAUDE.md', error);
    throw error;
  }
}
