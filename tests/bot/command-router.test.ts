/**
 * 命令路由测试
 */

import { describe, it, expect, vi } from 'vitest';
import { BotCommandRouter, prefixMatcher, extractArgs } from '../../src/bot/command-router.js';
import type { CommandHandler, CommandContext, BotReply, BotMessage } from '../../src/bot/types.js';

function createMessage(content: string): BotMessage {
  return {
    platform: 'dingtalk',
    messageId: 'msg-1',
    chatId: 'chat-1',
    chatType: 'group',
    senderId: 'user-1',
    senderName: '测试用户',
    content,
    rawContent: content,
    timestamp: new Date().toISOString(),
  };
}

function createHandler(name: string, aliases: string[], reply: BotReply): CommandHandler {
  return {
    name,
    aliases,
    description: `${name} command`,
    match: prefixMatcher(name, aliases),
    execute: vi.fn().mockResolvedValue(reply),
  };
}

describe('prefixMatcher', () => {
  it('should match exact command name', () => {
    const match = prefixMatcher('/status', ['状态']);
    expect(match('/status')).toBe(true);
  });

  it('should match command with args', () => {
    const match = prefixMatcher('/remind', ['提醒']);
    expect(match('/remind 30分钟后喝水')).toBe(true);
  });

  it('should match alias', () => {
    const match = prefixMatcher('/status', ['状态']);
    expect(match('状态')).toBe(true);
  });

  it('should be case insensitive', () => {
    const match = prefixMatcher('/Status', ['STATUS']);
    expect(match('/status')).toBe(true);
  });

  it('should not match partial', () => {
    const match = prefixMatcher('/status', ['状态']);
    expect(match('/statusx')).toBe(false);
  });
});

describe('extractArgs', () => {
  it('should extract args after command', () => {
    expect(extractArgs('/remind 30分钟后喝水', '/remind', ['提醒'])).toBe('30分钟后喝水');
  });

  it('should return empty for no args', () => {
    expect(extractArgs('/status', '/status', ['状态'])).toBe('');
  });

  it('should work with aliases', () => {
    expect(extractArgs('提醒 喝水', '/remind', ['提醒'])).toBe('喝水');
  });
});

describe('BotCommandRouter', () => {
  it('should dispatch to matching handler', async () => {
    const router = new BotCommandRouter();
    const handler = createHandler('/status', ['状态'], { content: 'ok', format: 'text' });
    router.register(handler);

    const ctx: CommandContext = { message: createMessage('/status') };
    const reply = await router.dispatch(ctx);

    expect(reply.content).toBe('ok');
    expect(handler.execute).toHaveBeenCalled();
  });

  it('should fallback to LLM handler when no match', async () => {
    const router = new BotCommandRouter();
    const statusHandler = createHandler('/status', ['状态'], { content: 'status', format: 'text' });
    const fallback = createHandler('chat', [], { content: 'AI回复', format: 'text', async: true });
    fallback.match = () => false; // never matches directly

    router.register(statusHandler);
    router.setFallback(fallback);

    const ctx: CommandContext = { message: createMessage('帮我调研下字节跳动') };
    const reply = await router.dispatch(ctx);

    expect(reply.content).toBe('AI回复');
    expect(fallback.execute).toHaveBeenCalled();
    expect(statusHandler.execute).not.toHaveBeenCalled();
  });

  it('should return help text when no match and no fallback', async () => {
    const router = new BotCommandRouter();
    router.register(createHandler('/help', ['帮助'], { content: 'help', format: 'text' }));

    const ctx: CommandContext = { message: createMessage('随便说点什么') };
    const reply = await router.dispatch(ctx);

    expect(reply.content).toContain('我能帮你');
  });

  it('should handle command execution errors', async () => {
    const router = new BotCommandRouter();
    const handler: CommandHandler = {
      name: '/bad',
      aliases: [],
      description: 'bad',
      match: prefixMatcher('/bad', []),
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    };
    router.register(handler);

    const ctx: CommandContext = { message: createMessage('/bad') };
    const reply = await router.dispatch(ctx);

    expect(reply.content).toContain('命令执行失败');
    expect(reply.content).toContain('boom');
  });
});
