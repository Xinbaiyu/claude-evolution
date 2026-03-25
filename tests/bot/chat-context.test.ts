/**
 * 群聊上下文记忆测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatContextManager } from '../../src/bot/chat-context.js';

describe('ChatContextManager', () => {
  let manager: ChatContextManager;

  beforeEach(() => {
    manager = new ChatContextManager(5, 1); // 窗口 5 条，超时 1 分钟
  });

  afterEach(() => {
    manager.shutdown();
  });

  it('should return empty history for new chat', () => {
    expect(manager.getHistory('chat-1')).toEqual([]);
  });

  it('should add and retrieve messages', () => {
    manager.addMessage('chat-1', 'user', '你好');
    manager.addMessage('chat-1', 'assistant', '你好！');

    const history = manager.getHistory('chat-1');
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ role: 'user', content: '你好' });
    expect(history[1]).toEqual({ role: 'assistant', content: '你好！' });
  });

  it('should enforce sliding window limit', () => {
    for (let i = 0; i < 8; i++) {
      manager.addMessage('chat-1', 'user', `msg-${i}`);
    }

    const history = manager.getHistory('chat-1');
    expect(history).toHaveLength(5); // window size = 5
    expect(history[0].content).toBe('msg-3'); // oldest kept
    expect(history[4].content).toBe('msg-7'); // newest
  });

  it('should isolate chats by chatId', () => {
    manager.addMessage('chat-1', 'user', 'hello');
    manager.addMessage('chat-2', 'user', 'world');

    expect(manager.getHistory('chat-1')).toHaveLength(1);
    expect(manager.getHistory('chat-2')).toHaveLength(1);
    expect(manager.getHistory('chat-1')[0].content).toBe('hello');
    expect(manager.getHistory('chat-2')[0].content).toBe('world');
  });

  it('should clear specific chat context', () => {
    manager.addMessage('chat-1', 'user', 'hello');
    manager.addMessage('chat-2', 'user', 'world');

    manager.clear('chat-1');

    expect(manager.getHistory('chat-1')).toEqual([]);
    expect(manager.getHistory('chat-2')).toHaveLength(1);
  });

  it('should clear all contexts', () => {
    manager.addMessage('chat-1', 'user', 'hello');
    manager.addMessage('chat-2', 'user', 'world');

    manager.clearAll();

    expect(manager.size).toBe(0);
  });

  it('should expire context after timeout', () => {
    vi.useFakeTimers();

    manager.addMessage('chat-1', 'user', 'hello');
    expect(manager.getHistory('chat-1')).toHaveLength(1);

    // Advance 2 minutes (timeout is 1 minute)
    vi.advanceTimersByTime(2 * 60 * 1000);

    expect(manager.getHistory('chat-1')).toEqual([]);

    vi.useRealTimers();
  });

  it('should not expire context before timeout', () => {
    vi.useFakeTimers();

    manager.addMessage('chat-1', 'user', 'hello');

    // Advance 30 seconds (timeout is 1 minute)
    vi.advanceTimersByTime(30 * 1000);

    expect(manager.getHistory('chat-1')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('should reset timeout on new message', () => {
    vi.useFakeTimers();

    manager.addMessage('chat-1', 'user', 'msg-1');

    // Advance 50 seconds
    vi.advanceTimersByTime(50 * 1000);
    manager.addMessage('chat-1', 'user', 'msg-2');

    // Advance another 50 seconds (100 total, but only 50 since last message)
    vi.advanceTimersByTime(50 * 1000);

    expect(manager.getHistory('chat-1')).toHaveLength(2);

    vi.useRealTimers();
  });

  it('should return a copy of messages, not reference', () => {
    manager.addMessage('chat-1', 'user', 'hello');
    const history = manager.getHistory('chat-1');
    history.push({ role: 'user', content: 'tampered' });

    expect(manager.getHistory('chat-1')).toHaveLength(1);
  });

  it('should track active chat count', () => {
    expect(manager.size).toBe(0);
    manager.addMessage('chat-1', 'user', 'hello');
    expect(manager.size).toBe(1);
    manager.addMessage('chat-2', 'user', 'world');
    expect(manager.size).toBe(2);
  });
});
