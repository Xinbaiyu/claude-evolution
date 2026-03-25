/**
 * 钉钉 Outgoing Webhook 签名验证 — 纯函数
 */

import crypto from 'crypto';

const MAX_TIMESTAMP_DRIFT_MS = 60 * 60 * 1000; // 1 小时

/** 计算钉钉签名 */
export function computeSignature(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

/** 验证钉钉回调签名 */
export function verifyDingTalkSignature(
  timestamp: string,
  sign: string,
  secret: string,
): boolean {
  if (!timestamp || !sign || !secret) return false;

  // 时间戳偏差检查
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const drift = Math.abs(Date.now() - ts);
  if (drift > MAX_TIMESTAMP_DRIFT_MS) return false;

  const expected = computeSignature(timestamp, secret);
  const signBuf = Buffer.from(sign, 'base64');
  const expectedBuf = Buffer.from(expected, 'base64');

  if (signBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(signBuf, expectedBuf);
}
