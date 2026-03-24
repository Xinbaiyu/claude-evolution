/**
 * Webhook 内置预设模板
 * 支持钉钉、飞书、企业微信、Slack Incoming Webhook
 */

import type { WebhookPreset, WebhookPresetName } from './webhook-types.js';
import { signDingTalkUrl } from './webhook-utils.js';

const dingtalkPreset: WebhookPreset = {
  name: 'dingtalk',
  label: '钉钉',
  template: '{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}',
  contentType: 'application/json',
  signFn: signDingTalkUrl,
};

const feishuPreset: WebhookPreset = {
  name: 'feishu',
  label: '飞书',
  template: '{"msg_type":"text","content":{"text":"{{title}}: {{body}}"}}',
  contentType: 'application/json',
  signFn: signDingTalkUrl, // 飞书签名算法同钉钉
};

const wecomPreset: WebhookPreset = {
  name: 'wecom',
  label: '企业微信',
  template: '{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}',
  contentType: 'application/json',
};

const slackIncomingPreset: WebhookPreset = {
  name: 'slack-incoming',
  label: 'Slack',
  template: '{"text":"*{{title}}*\\n{{body}}"}',
  contentType: 'application/json',
};

export const WEBHOOK_PRESETS: ReadonlyMap<WebhookPresetName, WebhookPreset> = new Map([
  ['dingtalk', dingtalkPreset],
  ['feishu', feishuPreset],
  ['wecom', wecomPreset],
  ['slack-incoming', slackIncomingPreset],
]);
