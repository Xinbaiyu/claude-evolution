/**
 * /help 帮助命令
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher } from '../command-router.js';

export class HelpCommand implements CommandHandler {
  readonly name = '/help';
  readonly aliases = ['帮助'];
  readonly description = '查看可用命令列表';

  private getCommandsHelp: () => string;

  constructor(getCommandsHelp: () => string) {
    this.getCommandsHelp = getCommandsHelp;
  }

  match = prefixMatcher(this.name, this.aliases);

  async execute(_ctx: CommandContext): Promise<BotReply> {
    const commands = this.getCommandsHelp();
    return {
      content: `### 可用命令\n\n${commands}\n\n> 发送其他内容将与 AI 对话`,
      format: 'markdown',
    };
  }
}
