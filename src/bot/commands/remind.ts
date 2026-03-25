/**
 * /remind 创建提醒命令
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher, extractArgs } from '../command-router.js';

export class RemindCommand implements CommandHandler {
  readonly name = '/remind';
  readonly aliases = ['提醒'];
  readonly description = '创建提醒，如: /remind 30分钟后喝水 或 一分钟后提醒我喝水';

  match(content: string): boolean {
    const lower = content.toLowerCase().trim();
    // 前缀匹配 /remind 或 提醒
    if (prefixMatcher(this.name, this.aliases)(lower)) return true;
    // 自然语言匹配：包含"提醒"且有时间词
    if (lower.includes('提醒') && /\d+\s*(分钟|小时|秒|min|h|s)|明天|后天/.test(lower)) return true;
    // 匹配 "N分钟后/N小时后...提醒/告诉/通知"
    if (/^\d+\s*(分钟|小时|秒)后/.test(lower) && /提醒|告诉|通知/.test(lower)) return true;
    return false;
  }

  async execute(ctx: CommandContext): Promise<BotReply> {
    if (!ctx.reminderService) {
      return { content: '提醒服务未就绪', format: 'text' };
    }

    // 先尝试从 /remind 或 提醒 前缀提取参数
    let args = extractArgs(ctx.message.content, this.name, this.aliases);
    // 如果前缀提取为空，说明是自然语言格式，直接用原始内容
    if (!args) {
      args = ctx.message.content.trim();
    }
    if (!args) {
      return { content: '请提供提醒内容，如: /remind 30分钟后喝水', format: 'text' };
    }

    // 解析时间和消息
    const { message, triggerAt } = parseRemindArgs(args);
    if (!message) {
      return { content: '无法解析提醒内容，请使用: /remind <时间> <内容>', format: 'text' };
    }

    try {
      const reminder = await ctx.reminderService.create(
        triggerAt
          ? { message, triggerAt: triggerAt.toISOString() }
          : { message }
      );

      const timeStr = triggerAt
        ? triggerAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '（需要手动设置时间）';

      return {
        content: `已设置提醒: "${reminder.message}"\n触发时间: ${timeStr}`,
        format: 'text',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: `创建提醒失败: ${msg}`, format: 'text' };
    }
  }
}

/** 简单的时间解析 */
function parseRemindArgs(args: string): { message: string; triggerAt: Date | null } {
  // 匹配 "N分钟后 <内容>" / "N小时后 <内容>"
  const relativeMatch = args.match(/^(\d+)\s*(分钟|小时|秒|min|h|s)后?\s+(.+)$/);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const message = relativeMatch[3].replace(/^(提醒我?|告诉我?|通知我?)\s*/, '').trim();
    return { message: message || relativeMatch[3].trim(), triggerAt: computeRelativeTime(num, unit) };
  }

  // 匹配 "一/二/半/...分钟后提醒我<内容>" 中文数字
  const cnRelativeMatch = args.match(/^([一二三四五六七八九十半]+)\s*(分钟|小时|秒)后?\s*(提醒我?|告诉我?|通知我?)?\s*(.+)$/);
  if (cnRelativeMatch) {
    const num = chineseToNum(cnRelativeMatch[1]);
    const unit = cnRelativeMatch[2];
    const message = cnRelativeMatch[4].trim();
    return { message, triggerAt: computeRelativeTime(num, unit) };
  }

  // 匹配 "<内容> N分钟后" 或 "N分钟后提醒我<内容>"（时间在中间）
  const midTimeMatch = args.match(/^(\d+)\s*(分钟|小时|秒)后?\s*(提醒我?|告诉我?|通知我?)\s*(.+)$/);
  if (midTimeMatch) {
    const num = parseInt(midTimeMatch[1], 10);
    const unit = midTimeMatch[2];
    const message = midTimeMatch[4].trim();
    return { message, triggerAt: computeRelativeTime(num, unit) };
  }

  // 匹配 "明天HH:MM <内容>"
  const tomorrowMatch = args.match(/^明天\s*(\d{1,2})[:.:](\d{2})\s+(.+)$/);
  if (tomorrowMatch) {
    const h = parseInt(tomorrowMatch[1], 10);
    const m = parseInt(tomorrowMatch[2], 10);
    const message = tomorrowMatch[3].trim();
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return { message, triggerAt: d };
  }

  // 无法解析时间，把全部内容作为 message
  return { message: args, triggerAt: null };
}

function computeRelativeTime(num: number, unit: string): Date {
  const now = new Date();
  if (unit === '秒' || unit === 's') {
    now.setSeconds(now.getSeconds() + num);
  } else if (unit === '分钟' || unit === 'min') {
    now.setMinutes(now.getMinutes() + num);
  } else if (unit === '小时' || unit === 'h') {
    now.setHours(now.getHours() + num);
  }
  return now;
}

const CN_NUM_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '半': 0.5,
};

function chineseToNum(cn: string): number {
  if (CN_NUM_MAP[cn] !== undefined) return CN_NUM_MAP[cn];
  // 简单处理：十一=11, 二十=20, 二十五=25
  let result = 0;
  for (const ch of cn) {
    const val = CN_NUM_MAP[ch];
    if (val === undefined) continue;
    if (ch === '十') {
      result = result === 0 ? 10 : result * 10;
    } else {
      result += val;
    }
  }
  return result || 1;
}
