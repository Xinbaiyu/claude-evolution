import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTemplate, signDingTalkUrl } from '../../src/notifications/webhook-utils.js';

describe('renderTemplate', () => {
  const baseVars = {
    title: '提醒',
    body: '检查部署',
    type: 'reminder' as const,
    timestamp: '2026-03-24T12:00:00Z',
  };

  it('replaces all known variables', () => {
    const template = '{{title}} - {{body}} [{{type}}] at {{timestamp}}';
    const result = renderTemplate(template, baseVars);
    expect(result).toBe('提醒 - 检查部署 [reminder] at 2026-03-24T12:00:00Z');
  });

  it('handles unknown variables by replacing with empty string', () => {
    const template = '{{title}}: {{unknown}}';
    const result = renderTemplate(template, baseVars);
    expect(result).toBe('提醒: ');
  });

  it('escapes double quotes for JSON safety', () => {
    const vars = { ...baseVars, body: 'He said "hello"' };
    const template = '{"text":"{{body}}"}';
    const result = renderTemplate(template, vars);
    expect(result).toBe('{"text":"He said \\"hello\\""}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('escapes newlines for JSON safety', () => {
    const vars = { ...baseVars, body: 'line1\nline2' };
    const template = '{"text":"{{body}}"}';
    const result = renderTemplate(template, vars);
    expect(result).toBe('{"text":"line1\\nline2"}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('escapes backslashes for JSON safety', () => {
    const vars = { ...baseVars, body: 'path\\to\\file' };
    const template = '{"text":"{{body}}"}';
    const result = renderTemplate(template, vars);
    expect(result).toBe('{"text":"path\\\\to\\\\file"}');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('escapes tabs and carriage returns', () => {
    const vars = { ...baseVars, body: 'col1\tcol2\rend' };
    const template = '{"text":"{{body}}"}';
    const result = renderTemplate(template, vars);
    expect(result).toContain('\\t');
    expect(result).toContain('\\r');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('handles template with no variables', () => {
    const result = renderTemplate('static text', baseVars);
    expect(result).toBe('static text');
  });

  it('handles complex DingTalk template', () => {
    const template = '{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}';
    const result = renderTemplate(template, baseVars);
    const parsed = JSON.parse(result);
    expect(parsed.msgtype).toBe('text');
    expect(parsed.text.content).toBe('提醒: 检查部署');
  });
});

describe('signDingTalkUrl', () => {
  it('appends timestamp and sign to URL with existing query params', () => {
    const url = 'https://oapi.dingtalk.com/robot/send?access_token=abc';
    const result = signDingTalkUrl(url, 'SECtest');
    expect(result).toContain('&timestamp=');
    expect(result).toContain('&sign=');
    expect(result).toMatch(/^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=abc&timestamp=\d+&sign=.+$/);
  });

  it('appends timestamp and sign to URL without query params', () => {
    const url = 'https://example.com/webhook';
    const result = signDingTalkUrl(url, 'SECtest');
    expect(result).toContain('?timestamp=');
    expect(result).toContain('&sign=');
  });

  it('produces different signatures for different secrets', () => {
    const url = 'https://example.com/webhook';
    // Use a fixed timestamp approach - just verify signatures differ
    const result1 = signDingTalkUrl(url, 'SECRET1');
    const result2 = signDingTalkUrl(url, 'SECRET2');
    const sign1 = result1.split('sign=')[1];
    const sign2 = result2.split('sign=')[1];
    expect(sign1).not.toBe(sign2);
  });

  it('produces URL-encoded base64 signature', () => {
    const url = 'https://example.com/webhook';
    const result = signDingTalkUrl(url, 'SECtest');
    const sign = result.split('sign=')[1];
    // URL-encoded base64 should not contain raw + or /
    expect(sign).not.toMatch(/[+/]/);
  });
});
