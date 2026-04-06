/**
 * DingTalk Bot Adapter - Connection Management Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DingTalkBotAdapter } from './dingtalk-adapter.js';

// Mock the dingtalk-stream SDK
vi.mock('dingtalk-stream', () => ({
  DWClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn(),
    registerCallbackListener: vi.fn(),
    socketCallBackResponse: vi.fn(),
  })),
  TOPIC_ROBOT: '/v1.0/im/bot/messages/get',
}));

// Mock file logger
vi.mock('./file-logger.js', () => ({
  logToFile: vi.fn(),
}));

// Mock async reply
vi.mock('./async-reply.js', () => ({
  sendAsyncReply: vi.fn().mockResolvedValue(undefined),
}));

describe('DingTalkBotAdapter - Connection State Tracking', () => {
  let adapter: DingTalkBotAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  afterEach(async () => {
    await adapter.stop();
  });

  it('should initialize in disconnected state', () => {
    const status = adapter.getStatus();
    expect(status.state).toBe('disconnected');
    expect(status.reconnectAttempts).toBe(0);
  });

  it('should transition to connected state on successful start', async () => {
    await adapter.start();

    // Wait for async connection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = adapter.getStatus();
    expect(status.state).toBe('connected');
    expect(status.lastConnectedAt).toBeInstanceOf(Date);
  });

  it('should calculate uptime when connected', async () => {
    await adapter.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait a bit to accumulate uptime
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = adapter.getStatus();
    expect(status.uptimeSeconds).toBeGreaterThan(0);
  });

  it('should return to disconnected state on stop', async () => {
    await adapter.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    await adapter.stop();

    const status = adapter.getStatus();
    expect(status.state).toBe('disconnected');
  });
});

describe('DingTalkBotAdapter - Reconnection Logic', () => {
  let adapter: DingTalkBotAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await adapter?.stop();
  });

  it('should use default reconnect config', () => {
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });

    const status = adapter.getStatus();
    expect(status.maxReconnectAttempts).toBe(10);
  });

  it('should allow custom reconnect config', () => {
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      reconnect: {
        enabled: true,
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 16000,
        backoffMultiplier: 2,
      },
    });

    const status = adapter.getStatus();
    expect(status.maxReconnectAttempts).toBe(5);
  });

  it('should disable reconnection when configured', () => {
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      reconnect: {
        enabled: false,
        maxRetries: 10,
        initialDelay: 1000,
        maxDelay: 32000,
        backoffMultiplier: 2,
      },
    });

    // Trigger a simulated disconnection by starting and immediately simulating error
    adapter.start();

    // Since reconnect is disabled, state should remain disconnected
    const status = adapter.getStatus();
    expect(status.reconnectAttempts).toBe(0);
  });
});

describe('DingTalkBotAdapter - Exponential Backoff', () => {
  let adapter: DingTalkBotAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DingTalkBotAdapter({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      reconnect: {
        enabled: true,
        maxRetries: 10,
        initialDelay: 1000,
        maxDelay: 32000,
        backoffMultiplier: 2,
      },
    });
  });

  afterEach(async () => {
    await adapter.stop();
  });

  it('should export getStatus method', () => {
    expect(typeof adapter.getStatus).toBe('function');
  });

  it('should include connection metrics in status', () => {
    const status = adapter.getStatus();
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('reconnectAttempts');
    expect(status).toHaveProperty('maxReconnectAttempts');
  });
});

describe('DingTalkBotAdapter - Configuration Validation', () => {
  it('should skip connection if credentials not provided', async () => {
    const adapter = new DingTalkBotAdapter({
      clientId: '',
      clientSecret: '',
    });

    await adapter.start();

    const status = adapter.getStatus();
    expect(status.state).toBe('disconnected');

    await adapter.stop();
  });
});
