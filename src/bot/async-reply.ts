/**
 * 异步回复模块 — 通过 sessionWebhook POST 推送消息到钉钉
 */

import { formatDingTalkReply } from './reply-formatter.js';
import type { BotReply } from './types.js';

/** 通过 sessionWebhook 异步推送回复 */
export async function sendAsyncReply(
  sessionWebhook: string,
  reply: BotReply,
): Promise<void> {
  const body = formatDingTalkReply(reply);

  const response = await fetch(sessionWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`sessionWebhook POST failed: HTTP ${response.status} ${text.slice(0, 200)}`);
  }
}
