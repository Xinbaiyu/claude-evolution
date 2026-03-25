/**
 * CC Bridge handler 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CCBridgeHandler } from '../../src/bot/commands/cc-bridge.js';
import { ChatContextManager } from '../../src/bot/chat-context.js';
import type { CommandContext, BotMessage } from '../../src/bot/types.js';

// Mock dependencies
vi.mock('../../src/bot/cc-executor.js', () => ({
  executeCC: vi.fn().mockResolvedValue({
    success: true,
    result: 'function reverse(s) { return s.split("").reverse().join(""); }',
    durationMs: 3000,
  }),
  expandHome: vi.fn((p: string) => p.replace('~', '/home/user')),
}));

vi.mock('../../src/bot/async-reply.js', () => ({
  sendAsyncReply: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    bot: {
      cc: {
        enabled: true,
        defaultCwd: '~/projects',
        allowedDirs: ['~/projects', '~/work'],
        timeoutMs: 60000,
        maxBudgetUsd: 1.0,
        permissionMode: 'bypassPermissions',
      },
    },
  }),
}));

import { executeCC } from '../../src/bot/cc-executor.js';
import { sendAsyncReply } from '../../src/bot/async-reply.js';

function createMessage(content: string): BotMessage {
  return {
    platform: 'dingtalk',
    messageId: 'msg-1',
    chatId: 'chat-1',
    chatType: 'group',
    senderId: 'user-1',
    senderName: '测试',
    content,
    rawContent: content,
    timestamp: new Date().toISOString(),
    sessionWebhook: 'https://example.com/webhook',
  };
}

describe('CCBridgeHandler', () => {
  let handler: CCBridgeHandler;
  let contextManager: ChatContextManager;

  beforeEach(() => {
    vi.clearAllMocks();
    contextManager = new ChatContextManager(20, 30);
    handler = new CCBridgeHandler(contextManager);
  });

  afterEach(() => {
    contextManager.shutdown();
  });

  it('should never match directly (fallback only)', () => {
    expect(handler.match('any text')).toBe(false);
  });

  it('should return async reply', async () => {
    const ctx: CommandContext = { message: createMessage('帮我写个函数') };
    const reply = await handler.execute(ctx);

    expect(reply.async).toBe(true);
    expect(reply.content).toContain('正在处理');
  });

  it('should add user message to context', async () => {
    const ctx: CommandContext = { message: createMessage('帮我写个函数') };
    await handler.execute(ctx);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    const history = contextManager.getHistory('chat-1');
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('帮我写个函数');
  });

  it('should call executeCC with correct params', async () => {
    const ctx: CommandContext = { message: createMessage('帮我写个函数') };
    await handler.execute(ctx);

    await new Promise((r) => setTimeout(r, 50));

    expect(executeCC).toHaveBeenCalledWith(expect.objectContaining({
      prompt: '帮我写个函数',
      cwd: '~/projects',
      timeoutMs: 60000,
      maxBudgetUsd: 1.0,
    }));
  });

  it('should extract cwd from message', async () => {
    const ctx: CommandContext = { message: createMessage('在 ~/work/app 帮我看bug') };
    await handler.execute(ctx);

    await new Promise((r) => setTimeout(r, 50));

    expect(executeCC).toHaveBeenCalledWith(expect.objectContaining({
      prompt: '帮我看bug',
      cwd: '~/work/app',
    }));
  });

  it('should reject disallowed paths', async () => {
    const ctx: CommandContext = { message: createMessage('在 /etc 帮我看配置') };
    await handler.execute(ctx);

    await new Promise((r) => setTimeout(r, 50));

    expect(executeCC).not.toHaveBeenCalled();
    expect(sendAsyncReply).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({ content: expect.stringContaining('不在允许列表中') }),
    );
  });

  it('should push result via sessionWebhook', async () => {
    const ctx: CommandContext = { message: createMessage('帮我写个函数') };
    await handler.execute(ctx);

    await new Promise((r) => setTimeout(r, 50));

    expect(sendAsyncReply).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        format: 'markdown',
        content: expect.stringContaining('reverse'),
      }),
    );
  });
});
