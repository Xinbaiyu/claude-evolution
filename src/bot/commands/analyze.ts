/**
 * /analyze 手动触发分析命令
 */

import type { CommandHandler, CommandContext, BotReply } from '../types.js';
import { prefixMatcher } from '../command-router.js';

export class AnalyzeCommand implements CommandHandler {
  readonly name = '/analyze';
  readonly aliases = ['分析'];
  readonly description = '手动触发代码分析';

  match = prefixMatcher(this.name, this.aliases);

  async execute(ctx: CommandContext): Promise<BotReply> {
    if (!ctx.executor) {
      return { content: '分析执行器未就绪', format: 'text' };
    }

    const state = ctx.executor.getState();
    if (state.isRunning) {
      return { content: '分析正在进行中，请稍候', format: 'text' };
    }

    // 异步执行分析（不阻塞回复）
    ctx.executor.execute().then((result) => {
      console.log(`[Bot] 分析完成，用时 ${result.duration}s，发现 ${result.observationsCount} 条观察`);
    }).catch((error) => {
      console.error('[Bot] 分析失败:', error);
    });

    return { content: '分析已启动，完成后会通过通知渠道告知你', format: 'text' };
  }
}
