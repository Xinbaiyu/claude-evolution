/**
 * /status 系统状态命令
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher } from '../command-router.js';

const CONFIG_DIR = path.join(os.homedir(), '.claude-evolution');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const STATUS_FILE = path.join(CONFIG_DIR, 'status.json');

export class StatusCommand implements CommandHandler {
  readonly name = '/status';
  readonly aliases = ['状态'];
  readonly description = '查看系统运行状态';

  match = prefixMatcher(this.name, this.aliases);

  async execute(ctx: CommandContext): Promise<BotReply> {
    const lines: string[] = ['### 系统状态'];

    // 调度器状态
    const config = await fs.pathExists(CONFIG_FILE)
      ? await fs.readJson(CONFIG_FILE)
      : {};

    const schedulerEnabled = config.scheduler?.enabled !== false;
    lines.push(`- 调度器: **${schedulerEnabled ? '运行中' : '已禁用'}**`);

    if (schedulerEnabled) {
      const interval = config.scheduler?.interval || '6h';
      if (interval === 'timepoints') {
        const times = config.scheduler?.scheduleTimes || [];
        lines.push(`- 模式: 定时 (${times.join(', ')})`);
      } else {
        lines.push(`- 间隔: ${interval}`);
      }
    }

    // 上次分析
    if (await fs.pathExists(STATUS_FILE)) {
      try {
        const status = await fs.readJson(STATUS_FILE);
        if (status.lastAnalysis) {
          const last = new Date(status.lastAnalysis);
          const ago = formatTimeAgo(last);
          lines.push(`- 上次分析: ${ago}`);
        }
      } catch {
        // ignore
      }
    }

    // 分析器状态
    if (ctx.executor) {
      const state = ctx.executor.getState();
      if (state.isRunning) {
        lines.push(`- 当前: **分析进行中**`);
      }
    }

    // 观察数量
    const activePath = path.join(CONFIG_DIR, 'memory', 'observations', 'active.json');
    const contextPath = path.join(CONFIG_DIR, 'memory', 'observations', 'context.json');

    let activeCount = 0;
    let contextCount = 0;
    if (await fs.pathExists(activePath)) {
      try { activeCount = (await fs.readJson(activePath)).length; } catch { /* */ }
    }
    if (await fs.pathExists(contextPath)) {
      try { contextCount = (await fs.readJson(contextPath)).length; } catch { /* */ }
    }

    lines.push(`- 观察: ${activeCount} 条活跃 / ${contextCount} 条上下文`);

    return { content: lines.join('\n'), format: 'markdown' };
  }
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}
