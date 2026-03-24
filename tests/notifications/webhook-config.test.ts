import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-create the schema inline to test it independently
const WebhookEndpointSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  preset: z.enum(['dingtalk', 'feishu', 'wecom', 'slack-incoming']).optional(),
  template: z.string().optional(),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
});

const WebhookChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  webhooks: z.array(WebhookEndpointSchema).default([]),
});

describe('Webhook config schema validation', () => {
  it('accepts valid dingtalk config', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: '钉钉-团队群',
      url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
      preset: 'dingtalk',
      secret: 'SECabc123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid config with custom template', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: '自定义',
      url: 'https://example.com/webhook',
      template: '{"text":"{{title}}: {{body}}"}',
    });
    expect(result.success).toBe(true);
  });

  it('rejects config without name', () => {
    const result = WebhookEndpointSchema.safeParse({
      url: 'https://example.com/webhook',
    });
    expect(result.success).toBe(false);
  });

  it('rejects config without url', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects config with invalid url', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: 'test',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects config with invalid preset', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: 'test',
      url: 'https://example.com/webhook',
      preset: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('defaults enabled to true', () => {
    const result = WebhookEndpointSchema.parse({
      name: 'test',
      url: 'https://example.com/webhook',
    });
    expect(result.enabled).toBe(true);
  });

  it('accepts disabled webhook', () => {
    const result = WebhookEndpointSchema.safeParse({
      name: 'test',
      url: 'https://example.com/webhook',
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it('channel config defaults to disabled with empty webhooks', () => {
    const result = WebhookChannelConfigSchema.parse({});
    expect(result.enabled).toBe(false);
    expect(result.webhooks).toEqual([]);
  });

  it('accepts full channel config with multiple webhooks', () => {
    const result = WebhookChannelConfigSchema.safeParse({
      enabled: true,
      webhooks: [
        { name: '钉钉', url: 'https://dingtalk.example.com', preset: 'dingtalk' },
        { name: '飞书', url: 'https://feishu.example.com', preset: 'feishu' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.webhooks).toHaveLength(2);
    }
  });
});
