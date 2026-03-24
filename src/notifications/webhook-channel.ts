/**
 * Webhook 通知渠道
 * 支持多 webhook 端点并行发送，内置预设模板 + 自定义模板
 */

import { logger } from '../utils/index.js';
import type { Notification, NotificationChannel } from './channel.js';
import type { WebhookEndpointConfig, TemplateVariables } from './webhook-types.js';
import { WEBHOOK_PRESETS } from './webhook-presets.js';
import { renderTemplate } from './webhook-utils.js';

export class WebhookChannel implements NotificationChannel {
  readonly name = 'webhook';

  constructor(
    private readonly webhooks: readonly WebhookEndpointConfig[],
  ) {}

  async send(notification: Notification): Promise<void> {
    const enabledWebhooks = this.webhooks.filter(
      (wh) => wh.enabled !== false,
    );

    if (enabledWebhooks.length === 0) {
      return;
    }

    const vars: TemplateVariables = {
      title: notification.title,
      body: notification.body,
      type: notification.type,
      timestamp: new Date().toISOString(),
    };

    const results = await Promise.allSettled(
      enabledWebhooks.map((wh) => this.sendToEndpoint(wh, vars)),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        logger.warn(
          `Webhook [${enabledWebhooks[i].name}] 发送失败: ${result.reason}`,
        );
      }
    }
  }

  private async sendToEndpoint(
    endpoint: WebhookEndpointConfig,
    vars: TemplateVariables,
  ): Promise<void> {
    const preset = endpoint.preset
      ? WEBHOOK_PRESETS.get(endpoint.preset)
      : undefined;

    const template =
      endpoint.template ?? preset?.template ?? '{"text":"{{title}}: {{body}}"}';
    const contentType = preset?.contentType ?? 'application/json';

    const body = renderTemplate(template, vars);

    let url = endpoint.url;
    if (endpoint.secret && preset?.signFn) {
      url = preset.signFn(url, endpoint.secret);
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ...endpoint.headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${response.status} from ${endpoint.name}: ${text.slice(0, 200)}`,
      );
    }
  }
}
