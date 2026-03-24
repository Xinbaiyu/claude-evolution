import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookChannel } from '../../src/notifications/webhook-channel.js';
import type { Notification } from '../../src/notifications/channel.js';
import type { WebhookEndpointConfig } from '../../src/notifications/webhook-types.js';

vi.mock('../../src/utils/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const testNotification: Notification = {
  title: '提醒',
  body: '下班啦',
  type: 'reminder',
};

describe('WebhookChannel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has name "webhook"', () => {
    const channel = new WebhookChannel([]);
    expect(channel.name).toBe('webhook');
  });

  it('does nothing when no webhooks configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const channel = new WebhookChannel([]);
    await channel.send(testNotification);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends to a single webhook with preset', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [{
      name: '钉钉',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      preset: 'dingtalk',
    }];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://oapi.dingtalk.com/robot/send?access_token=test');
    const body = JSON.parse(opts!.body as string);
    expect(body.msgtype).toBe('text');
    expect(body.text.content).toContain('提醒');
    expect(body.text.content).toContain('下班啦');
  });

  it('sends to multiple webhooks in parallel', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [
      { name: '钉钉', url: 'https://dingtalk.example.com', preset: 'dingtalk' },
      { name: '飞书', url: 'https://feishu.example.com', preset: 'feishu' },
    ];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('skips disabled webhooks', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [
      { name: '禁用', url: 'https://disabled.example.com', enabled: false },
      { name: '启用', url: 'https://enabled.example.com', preset: 'dingtalk' },
    ];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe('https://enabled.example.com');
  });

  it('continues when one webhook fails (graceful degradation)', async () => {
    const { logger } = await import('../../src/utils/index.js');
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const webhooks: WebhookEndpointConfig[] = [
      { name: '失败', url: 'https://fail.example.com', preset: 'dingtalk' },
      { name: '成功', url: 'https://ok.example.com', preset: 'dingtalk' },
    ];

    const channel = new WebhookChannel(webhooks);
    await expect(channel.send(testNotification)).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('失败'),
    );
  });

  it('handles HTTP error responses', async () => {
    const { logger } = await import('../../src/utils/index.js');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const webhooks: WebhookEndpointConfig[] = [
      { name: '服务端错误', url: 'https://error.example.com', preset: 'dingtalk' },
    ];

    const channel = new WebhookChannel(webhooks);
    await expect(channel.send(testNotification)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('HTTP 500'),
    );
  });

  it('applies DingTalk signing when secret is provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [{
      name: '签名钉钉',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      preset: 'dingtalk',
      secret: 'SECtest123',
    }];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('timestamp=');
    expect(calledUrl).toContain('sign=');
  });

  it('uses custom template when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [{
      name: '自定义',
      url: 'https://custom.example.com',
      template: '{"msg":"[{{type}}] {{title}} - {{body}}"}',
    }];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.msg).toBe('[reminder] 提醒 - 下班啦');
  });

  it('uses custom headers when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', { status: 200 }),
    );

    const webhooks: WebhookEndpointConfig[] = [{
      name: '自定义头',
      url: 'https://custom.example.com',
      preset: 'dingtalk',
      headers: { 'X-Custom': 'value' },
    }];

    const channel = new WebhookChannel(webhooks);
    await channel.send(testNotification);

    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('value');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
