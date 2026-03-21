import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { getEvolutionDir } from '../config/loader.js';
import { regenerateClaudeMdFromDisk } from '../memory/claudemd-generator.js';
import { getObservationPaths } from '../memory/observation-manager.js';
import { logger } from '../utils/index.js';

/**
 * 文件监听器
 * 监听 source/ 目录和 context.json 的变化,自动重新生成 CLAUDE.md
 */

/**
 * 启动文件监听
 */
export function watchSourceFiles(): FSWatcher {
  const evolutionDir = getEvolutionDir();
  const sourceDir = path.join(evolutionDir, 'source');
  const { context: contextJsonPath } = getObservationPaths();

  logger.info('启动文件监听...');

  const watcher = chokidar.watch([sourceDir, contextJsonPath], {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  let regenerateTimer: NodeJS.Timeout | null = null;

  const scheduleRegenerate = (filePath: string) => {
    if (regenerateTimer) {
      clearTimeout(regenerateTimer);
    }

    regenerateTimer = setTimeout(async () => {
      logger.info(`检测到文件变更: ${path.basename(filePath)}`);
      logger.info('重新生成 CLAUDE.md...');

      try {
        await regenerateClaudeMdFromDisk();
        logger.success('✓ CLAUDE.md 已更新');
      } catch (error) {
        logger.error('重新生成 CLAUDE.md 失败:', error);
      }

      regenerateTimer = null;
    }, 500);
  };

  const shouldWatch = (filePath: string): boolean => {
    return filePath.endsWith('.md') || filePath.endsWith('context.json');
  };

  watcher
    .on('add', (filePath) => {
      if (shouldWatch(filePath)) {
        scheduleRegenerate(filePath);
      }
    })
    .on('change', (filePath) => {
      if (shouldWatch(filePath)) {
        scheduleRegenerate(filePath);
      }
    })
    .on('unlink', (filePath) => {
      if (shouldWatch(filePath)) {
        scheduleRegenerate(filePath);
      }
    })
    .on('error', (error) => {
      logger.error('文件监听错误:', error);
    });

  logger.success('✓ 文件监听已启动');
  logger.debug(`  监听目录: ${sourceDir}`);
  logger.debug(`  监听文件: ${contextJsonPath}`);

  return watcher;
}

/**
 * 停止文件监听
 */
export async function stopWatching(watcher: FSWatcher): Promise<void> {
  await watcher.close();
  logger.info('文件监听已停止');
}
