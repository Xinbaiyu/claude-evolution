/**
 * /myid 查看当前用户 ID（用于配置提醒推送）
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher } from '../command-router.js';

export class MyIdCommand implements CommandHandler {
  readonly name = '/myid';
  readonly aliases = ['我的ID'];
  readonly description = '查看你的钉钉用户 ID（用于配置提醒推送）';

  match = prefixMatcher(this.name, this.aliases);

  async execute(ctx: CommandContext): Promise<BotReply> {
    const { senderId, senderName } = ctx.message;
    return {
      content: `你的钉钉用户信息:\n- 昵称: ${senderName}\n- userId: ${senderId}\n\n将此 userId 填入机器人配置的"提醒推送用户"中，即可通过私聊接收提醒通知。`,
      format: 'text',
    };
  }
}
