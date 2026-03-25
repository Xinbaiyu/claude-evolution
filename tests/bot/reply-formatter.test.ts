/**
 * 回复格式化测试
 */

import { describe, it, expect } from 'vitest';
import { formatDingTalkReply, formatThinkingReply } from '../../src/bot/reply-formatter.js';

describe('formatDingTalkReply', () => {
  it('should format text reply', () => {
    const result = formatDingTalkReply({ content: '你好', format: 'text' });
    expect(result).toEqual({
      msgtype: 'text',
      text: { content: '你好' },
    });
  });

  it('should format markdown reply', () => {
    const result = formatDingTalkReply({ content: '### 标题\n内容', format: 'markdown' });
    expect(result).toEqual({
      msgtype: 'markdown',
      markdown: {
        title: '标题',
        text: '### 标题\n内容',
      },
    });
  });

  it('should truncate long content', () => {
    const longContent = 'A'.repeat(3000);
    const result = formatDingTalkReply({ content: longContent, format: 'text' });
    expect(result.text!.content.length).toBeLessThanOrEqual(2000);
    expect(result.text!.content).toContain('内容已截断');
  });

  it('should not truncate content under limit', () => {
    const content = 'A'.repeat(1999);
    const result = formatDingTalkReply({ content, format: 'text' });
    expect(result.text!.content).toBe(content);
  });

  it('should extract title from markdown heading', () => {
    const result = formatDingTalkReply({ content: '## 系统状态\n内容', format: 'markdown' });
    expect(result.markdown!.title).toBe('系统状态');
  });

  it('should truncate long title', () => {
    const longTitle = '这是一个非常非常非常非常非常非常非常非常非常长的标题啊';
    const result = formatDingTalkReply({ content: longTitle, format: 'markdown' });
    expect(result.markdown!.title.length).toBeLessThanOrEqual(23); // 20 + "..."
  });
});

describe('formatThinkingReply', () => {
  it('should return thinking message', () => {
    const result = formatThinkingReply();
    expect(result).toEqual({
      msgtype: 'text',
      text: { content: '正在思考...' },
    });
  });
});
