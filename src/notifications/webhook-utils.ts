/**
 * Webhook 工具函数
 * - 模板变量替换（带 JSON 转义）
 * - 钉钉 HMAC-SHA256 签名
 */

import { createHmac } from 'node:crypto';
import type { TemplateVariables } from './webhook-types.js';

/**
 * JSON 转义字符串中的特殊字符
 * 用于安全插入到 JSON 模板中
 */
function escapeJsonValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * 渲染模板，替换 {{variable}} 占位符
 * 值会进行 JSON 转义以防止格式破坏
 */
export function renderTemplate(
  template: string,
  vars: TemplateVariables,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = vars[key as keyof TemplateVariables];
    return value !== undefined ? escapeJsonValue(value) : '';
  });
}

/**
 * 为钉钉/飞书 webhook URL 添加 HMAC-SHA256 签名
 *
 * 算法: sign = URLEncode(Base64(HmacSHA256(timestamp + "\n" + secret, secret)))
 * 签名后追加 &timestamp=<ms>&sign=<sign> 到 URL
 */
export function signDingTalkUrl(url: string, secret: string): string {
  const timestamp = Date.now().toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  const sign = encodeURIComponent(hmac);

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}timestamp=${timestamp}&sign=${sign}`;
}
