import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { Config } from '../config/index.js';
import { getEvolutionDir } from '../config/loader.js';
import { generateCLAUDEmd } from './md-generator.js';
import { logger } from '../utils/index.js';

/**
 * 文件监听器
 * 监听 source/ 和 learned/ 目录的变化,自动重新生成 CLAUDE.md
 */

/**
 * 启动文件监听
 */
export function watchSourceFiles(config: Config): FSWatcher {
  const evolutionDir = getEvolutionDir();
  const sourceDir = path.join(evolutionDir, 'source');
  const learnedDir = path.join(evolutionDir, 'learned');

  logger.info('启动文件监听...');

  const watcher = chokidar.watch([sourceDir, learnedDir], {
    persistent: true,
    ignoreInitial: true, // 不触发初始文件的事件
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  let regenerateTimer: NodeJS.Timeout | null = null;

  const scheduleRegenerate = (filePath: string) => {
    // 防抖: 500ms 内的多次变更只触发一次
    if (regenerateTimer) {
      clearTimeout(regenerateTimer);
    }

    regenerateTimer = setTimeout(async () => {
      logger.info(`检测到文件变更: ${path.basename(filePath)}`);
      logger.info('重新生成 CLAUDE.md...');

      try {
        await generateCLAUDEmd(config);
        logger.success('✓ CLAUDE.md 已更新');
      } catch (error) {
        logger.error('重新生成 CLAUDE.md 失败:', error);
      }

      regenerateTimer = null;
    }, 500);
  };

  watcher
    .on('add', (filePath) => {
      if (filePath.endsWith('.md')) {
        scheduleRegenerate(filePath);
      }
    })
    .on('change', (filePath) => {
      if (filePath.endsWith('.md')) {
        scheduleRegenerate(filePath);
      }
    })
    .on('unlink', (filePath) => {
      if (filePath.endsWith('.md')) {
        scheduleRegenerate(filePath);
      }
    })
    .on('error', (error) => {
      logger.error('文件监听错误:', error);
    });

  logger.success('✓ 文件监听已启动');
  logger.debug(`  监听目录: ${sourceDir}`);
  logger.debug(`  监听目录: ${learnedDir}`);

  return watcher;
}

/**
 * 停止文件监听
 */
export async function stopWatching(watcher: FSWatcher): Promise<void> {
  await watcher.close();
  logger.info('文件监听已停止');
}
