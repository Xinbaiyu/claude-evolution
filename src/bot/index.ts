/**
 * Bot 系统入口 — 创建 adapter、路由器、命令处理器
 */

import type { Router } from 'express';
import type { Config } from '../config/index.js';
import type { AnalysisExecutor } from '../analyzers/analysis-executor.js';
import type { ReminderService } from '../reminders/service.js';
import { DingTalkBotAdapter } from './dingtalk-adapter.js';
import { BotCommandRouter } from './command-router.js';
import { ChatContextManager } from './chat-context.js';
import { UserModePreferenceManager } from './user-mode-manager.js';
import { HelpCommand } from './commands/help.js';
import { StatusCommand } from './commands/status.js';
import { AnalyzeCommand } from './commands/analyze.js';
import { RemindCommand } from './commands/remind.js';
import { RemindersCommand } from './commands/reminders.js';
import { MyIdCommand } from './commands/myid.js';
import { ModeCommand } from './commands/mode.js';
import { CCBridgeHandler } from './commands/cc-bridge.js';
import { ChatCommand } from './commands/chat.js';
import type { CommandContext } from './types.js';

export interface BotSystem {
  adapter: DingTalkBotAdapter;
  router: BotCommandRouter;
  contextManager: ChatContextManager;
  shutdown(): void;
}

export function createBotSystem(
  config: Config,
  executor: AnalysisExecutor,
  reminderService: ReminderService | null,
): BotSystem {
  const botConfig = config.bot;
  const chatConfig = botConfig?.chat;

  // 上下文管理
  const contextManager = new ChatContextManager(
    chatConfig?.contextWindow ?? 20,
    chatConfig?.contextTimeoutMinutes ?? 30,
  );

  // 用户模式偏好管理
  const modeManager = new UserModePreferenceManager();

  // 命令路由
  const router = new BotCommandRouter(modeManager);

  // 注册固定命令
  router.register(new StatusCommand());
  router.register(new AnalyzeCommand());
  router.register(new RemindCommand());
  router.register(new RemindersCommand());
  router.register(new MyIdCommand());

  // 注册模式切换命令
  router.register(new ModeCommand(modeManager));

  // help 命令需要引用 router
  router.register(new HelpCommand(() => router.getHelpText()));

  // 设置 Agent 和 Chat 模式的 fallback handlers
  const agentHandler = config.agent
    ? new CCBridgeHandler(contextManager)
    : null;
  const chatHandler = chatConfig?.enabled !== false
    ? new ChatCommand(contextManager)
    : null;

  router.setModeHandlers(agentHandler, chatHandler);

  // 日志输出可用模式
  console.log('[Bot] 可用模式:', {
    agent: agentHandler ? '启用' : '禁用',
    chat: chatHandler ? '启用' : '禁用',
  });

  // 钉钉 adapter
  const adapter = new DingTalkBotAdapter({
    clientId: botConfig?.dingtalk?.clientId || '',
    clientSecret: botConfig?.dingtalk?.clientSecret || '',
  });

  adapter.onMessage(async (msg) => {
    const ctx: CommandContext = {
      message: msg,
      executor,
      reminderService: reminderService ?? undefined,
    };
    return router.dispatch(ctx);
  });

  return {
    adapter,
    router,
    contextManager,
    shutdown() {
      contextManager.shutdown();
      adapter.stop();
    },
  };
}
