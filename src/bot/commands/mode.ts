/**
 * 模式切换命令处理器
 *
 * 处理 /agent 和 /chat 命令，切换用户的工作模式
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import type { UserModePreferenceManager } from '../user-mode-manager.js';

export class ModeCommand implements CommandHandler {
  readonly name = 'mode';
  readonly aliases = ['agent', 'chat'];
  readonly description = '切换工作模式 (/agent 或 /chat)';

  constructor(private modeManager: UserModePreferenceManager) {}

  match(content: string): boolean {
    return /^\/(agent|chat)$/.test(content.trim());
  }

  async execute(ctx: CommandContext): Promise<BotReply> {
    const content = ctx.message.content.trim();
    const mode = content === '/agent' ? 'agent' : 'chat';

    this.modeManager.setMode(ctx.message.chatId, mode);

    const modeNames = {
      agent: 'Agent 模式（Claude Code 执行）',
      chat: 'Chat 模式（快速对话）',
    };

    const description = {
      agent: '适合执行代码任务、文件操作等复杂工作',
      chat: '适合快速对话交流，响应速度更快',
    };

    return {
      content: `✅ 已切换到 ${modeNames[mode]}\n\n${description[mode]}\n\n💡 提示：随时使用 /agent 或 /chat 切换模式`,
      format: 'text',
    };
  }
}
