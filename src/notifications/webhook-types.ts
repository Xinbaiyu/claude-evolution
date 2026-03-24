/**
 * Webhook 通知渠道类型定义
 */

/** 内置预设名称 */
export type WebhookPresetName = 'dingtalk' | 'feishu' | 'wecom' | 'slack-incoming';

/** 单个 webhook 端点配置 */
export interface WebhookEndpointConfig {
  readonly name: string;
  readonly url: string;
  readonly preset?: WebhookPresetName;
  readonly template?: string;
  readonly secret?: string;
  readonly headers?: Record<string, string>;
  readonly enabled?: boolean;
}

/** webhook 通道配置 */
export interface WebhookChannelConfig {
  readonly enabled: boolean;
  readonly webhooks: readonly WebhookEndpointConfig[];
}

/** 预设模板定义 */
export interface WebhookPreset {
  readonly name: WebhookPresetName;
  readonly label: string;
  readonly template: string;
  readonly contentType: string;
  readonly signFn?: (url: string, secret: string) => string;
}

/** 模板变量 */
export interface TemplateVariables {
  readonly title: string;
  readonly body: string;
  readonly type: string;
  readonly timestamp: string;
}
