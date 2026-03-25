/**
 * CC 执行器测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { expandHome } from '../../src/bot/cc-executor.js';

// Mock child_process
vi.mock('child_process', () => {
  const EventEmitter = require('events');

  function createMockChild() {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.killed = false;
    child.kill = vi.fn(() => { child.killed = true; });
    child.stdio = ['ignore', 'pipe', 'pipe'];
    return child;
  }

  let nextChild: any = null;

  return {
    spawn: vi.fn(() => {
      const child = nextChild || createMockChild();
      nextChild = null;
      return child;
    }),
    __setNextChild: (child: any) => { nextChild = child; },
    __createMockChild: createMockChild,
  };
});

import { spawn, __createMockChild } from 'child_process';
import { executeCC } from '../../src/bot/cc-executor.js';

describe('expandHome', () => {
  it('should expand ~ to home directory', () => {
    const result = expandHome('~/projects');
    expect(result).not.toContain('~');
    expect(result).toContain('projects');
  });

  it('should not modify absolute paths', () => {
    expect(expandHome('/usr/local')).toBe('/usr/local');
  });
});

describe('executeCC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should spawn claude with correct args', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({
      prompt: '帮我写个函数',
      cwd: '/tmp',
      maxBudgetUsd: 1.0,
    });

    // Simulate successful output
    child.stdout.emit('data', Buffer.from(JSON.stringify({ result: 'function foo() {}' })));
    child.emit('close', 0);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.result).toBe('function foo() {}');

    expect(spawn).toHaveBeenCalledWith('claude', expect.arrayContaining([
      '-p',
      '--output-format', 'json',
      '--max-budget-usd', '1',
      '帮我写个函数',
    ]), expect.objectContaining({
      cwd: '/tmp',
    }));
  });

  it('should handle ENOENT (claude not found)', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({ prompt: 'test', cwd: '/tmp' });
    child.emit('error', Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' }));

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('claude 命令未找到');
  });

  it('should handle non-zero exit code', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({ prompt: 'test', cwd: '/tmp' });
    child.stderr.emit('data', Buffer.from('something went wrong'));
    child.emit('close', 1);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('something went wrong');
  });

  it('should parse non-JSON output as plain text', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({ prompt: 'test', cwd: '/tmp' });
    child.stdout.emit('data', Buffer.from('plain text output'));
    child.emit('close', 0);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.result).toBe('plain text output');
  });

  it('should inject ANTHROPIC_BASE_URL when baseURL is set', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({
      prompt: 'test',
      cwd: '/tmp',
      baseURL: 'http://127.0.0.1:3456',
    });

    child.stdout.emit('data', Buffer.from('ok'));
    child.emit('close', 0);

    await promise;

    expect(spawn).toHaveBeenCalledWith('claude', expect.any(Array), expect.objectContaining({
      env: expect.objectContaining({
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:3456',
      }),
    }));
  });

  it('should include system prompt when provided', async () => {
    const child = (__createMockChild as any)();
    (spawn as any).mockReturnValue(child);

    const promise = executeCC({
      prompt: 'test',
      cwd: '/tmp',
      systemPrompt: '上下文信息',
    });

    child.stdout.emit('data', Buffer.from('ok'));
    child.emit('close', 0);

    await promise;

    expect(spawn).toHaveBeenCalledWith('claude', expect.arrayContaining([
      '--append-system-prompt', '上下文信息',
    ]), expect.any(Object));
  });
});
