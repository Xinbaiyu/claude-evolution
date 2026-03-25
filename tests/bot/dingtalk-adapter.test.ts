/**
 * DingTalk Adapter 测试 (Stream 模式)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DingTalkBotAdapter } from '../../src/bot/dingtalk-adapter.js';
import type { BotReply } from '../../src/bot/types.js';

// Mock dingtalk-stream SDK
vi.mock('dingtalk-stream', () => {
  const listeners = new Map<string, Function>();
  const mockClient = {
    registerCallbackListener: vi.fn((topic: string, cb: Function) => {
      listeners.set(topic, cb);
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    socketCallBackResponse: vi.fn(),
    _trigger: (topic: string, msg: any) => {
      const cb = listeners.get(topic);
      if (cb) cb(msg);
    },
    _listeners: listeners,
  };

  return {
    DWClient: vi.fn(() => mockClient),
    TOPIC_ROBOT: '/v1.0/im/bot/messages/get',
    __mockClient: mockClient,
  };
});

// Mock async-reply
vi.mock('../../src/bot/async-reply.js', () => ({
  sendAsyncReply: vi.fn().mockResolvedValue(undefined),
}));

import { __mockClient } from 'dingtalk-stream';
import { sendAsyncReply } from '../../src/bot/async-reply.js';

function createStreamMessage(content: string, extra: Record<string, any> = {}) {
  return {
    headers: {
      appId: 'app-1',
      connectionId: 'conn-1',
      contentType: 'application/json',
      messageId: 'stream-msg-1',
      time: new Date().toISOString(),
      topic: '/v1.0/im/bot/messages/get',
    },
    data: JSON.stringify({
      msgtype: 'text',
      text: { content },
      msgId: 'msg-001',
      conversationType: '2',
      conversationId: 'cid-001',
      senderNick: '张三',
      senderId: 'user-001',
      createAt: Date.now(),
      sessionWebhook: 'https://oapi.dingtalk.com/robot/sendBySession/xxx',
      ...extra,
    }),
    specVersion: '1.0',
    type: 'CALLBACK',
  };
}

describe('DingTalkBotAdapter (Stream)', () => {
  let adapter: DingTalkBotAdapter;
  const mockClient = (__mockClient as any);

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  it('should connect via DWClient on start', async () => {
    await adapter.start();
    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.registerCallbackListener).toHaveBeenCalledWith(
      '/v1.0/im/bot/messages/get',
      expect.any(Function),
    );
  });

  it('should disconnect on stop', async () => {
    await adapter.start();
    await adapter.stop();
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it('should ACK immediately on receiving message', async () => {
    const reply: BotReply = { content: 'ok', format: 'text' };
    adapter.onMessage(async () => reply);
    await adapter.start();

    const msg = createStreamMessage(' 状态');
    mockClient._trigger('/v1.0/im/bot/messages/get', msg);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 10));

    expect(mockClient.socketCallBackResponse).toHaveBeenCalledWith(
      'stream-msg-1',
      { status: 'SUCCESS' },
    );
  });

  it('should send reply via sessionWebhook', async () => {
    const reply: BotReply = { content: '运行中', format: 'text' };
    adapter.onMessage(async () => reply);
    await adapter.start();

    const msg = createStreamMessage(' 状态');
    mockClient._trigger('/v1.0/im/bot/messages/get', msg);

    await new Promise((r) => setTimeout(r, 10));

    expect(sendAsyncReply).toHaveBeenCalledWith(
      'https://oapi.dingtalk.com/robot/sendBySession/xxx',
      reply,
    );
  });

  it('should reject non-text messages', async () => {
    adapter.onMessage(async () => ({ content: 'ok', format: 'text' }));
    await adapter.start();

    const msg = createStreamMessage('');
    msg.data = JSON.stringify({
      ...JSON.parse(msg.data),
      msgtype: 'image',
    });
    mockClient._trigger('/v1.0/im/bot/messages/get', msg);

    await new Promise((r) => setTimeout(r, 10));

    expect(sendAsyncReply).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: '目前仅支持文本消息' }),
    );
  });

  it('should strip leading whitespace from content', async () => {
    let receivedContent = '';
    adapter.onMessage(async (m) => {
      receivedContent = m.content;
      return { content: 'ok', format: 'text' };
    });
    await adapter.start();

    const msg = createStreamMessage('  查看状态  ');
    mockClient._trigger('/v1.0/im/bot/messages/get', msg);

    await new Promise((r) => setTimeout(r, 10));
    expect(receivedContent).toBe('查看状态');
  });
});
