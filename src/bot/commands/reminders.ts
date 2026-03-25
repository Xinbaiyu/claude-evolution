/**
 * /reminders 列出提醒命令
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher } from '../command-router.js';

export class RemindersCommand implements CommandHandler {
  readonly name = '/reminders';
  readonly aliases = ['提醒列表'];
  readonly description = '查看所有活跃提醒';

  match = prefixMatcher(this.name, this.aliases);

  async execute(ctx: CommandContext): Promise<BotReply> {
    if (!ctx.reminderService) {
      return { content: '提醒服务未就绪', format: 'text' };
    }

    const reminders = ctx.reminderService.list().filter((r) => r.status === 'active');

    if (reminders.length === 0) {
      return { content: '暂无活跃提醒', format: 'text' };
    }

    const lines = ['### 活跃提醒', ''];
    for (const r of reminders) {
      const time = r.triggerAt
        ? new Date(r.triggerAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : r.schedule || '—';
      const type = r.type === 'recurring' ? '循环' : '一次性';
      lines.push(`- **${r.message}** (${type}, ${time})`);
    }

    return { content: lines.join('\n'), format: 'markdown' };
  }
}
