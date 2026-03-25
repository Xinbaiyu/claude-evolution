/**
 * 钉钉回复格式化 — 纯函数
 */

import type { BotReply } from './types.js';

const MAX_CONTENT_LENGTH = 2000;

export interface DingTalkResponse {
  msgtype: 'text' | 'markdown';
  text?: { content: string };
  markdown?: { title: string; text: string };
}

/** 截断过长内容 */
function truncate(content: string, limit: number = MAX_CONTENT_LENGTH): string {
  if (content.length <= limit) return content;
  return content.slice(0, limit - 15) + '\n...（内容已截断）';
}

/** 从 markdown 内容提取标题（前 20 字符或首行） */
function extractTitle(content: string): string {
  const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
  const title = firstLine || '回复';
  return title.length > 20 ? title.slice(0, 20) + '...' : title;
}

/** 将 BotReply 格式化为钉钉 response body */
export function formatDingTalkReply(reply: BotReply): DingTalkResponse {
  const content = truncate(reply.content);

  if (reply.format === 'markdown') {
    return {
      msgtype: 'markdown',
      markdown: {
        title: extractTitle(reply.content),
        text: content,
      },
    };
  }

  return {
    msgtype: 'text',
    text: { content },
  };
}

/** 生成"正在思考..."占位回复 */
export function formatThinkingReply(): DingTalkResponse {
  return {
    msgtype: 'text',
    text: { content: '正在思考...' },
  };
}
