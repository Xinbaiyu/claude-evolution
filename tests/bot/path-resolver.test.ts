/**
 * 路径解析 + 白名单测试
 */

import { describe, it, expect } from 'vitest';
import { resolveWorkingDir, isPathAllowed } from '../../src/bot/path-resolver.js';

describe('resolveWorkingDir', () => {
  it('should extract path from "在 <path> <prompt>"', () => {
    const result = resolveWorkingDir('在 ~/projects/myapp 帮我看下bug', '~');
    expect(result.cwd).toBe('~/projects/myapp');
    expect(result.prompt).toBe('帮我看下bug');
  });

  it('should extract path from "在<path>下 <prompt>"', () => {
    const result = resolveWorkingDir('在 ~/projects/myapp下 帮我看下', '~');
    expect(result.cwd).toBe('~/projects/myapp');
    expect(result.prompt).toBe('帮我看下');
  });

  it('should extract path from "cd <path> && <prompt>"', () => {
    const result = resolveWorkingDir('cd ~/work && ls -la', '~');
    expect(result.cwd).toBe('~/work');
    expect(result.prompt).toBe('ls -la');
  });

  it('should extract path from "cd <path> <prompt>"', () => {
    const result = resolveWorkingDir('cd /tmp 看下文件', '~');
    expect(result.cwd).toBe('/tmp');
    expect(result.prompt).toBe('看下文件');
  });

  it('should use default when no path specified', () => {
    const result = resolveWorkingDir('帮我写个函数', '~/default');
    expect(result.cwd).toBe('~/default');
    expect(result.prompt).toBe('帮我写个函数');
  });

  it('should handle absolute paths', () => {
    const result = resolveWorkingDir('在 /Users/test/project 分析代码', '~');
    expect(result.cwd).toBe('/Users/test/project');
    expect(result.prompt).toBe('分析代码');
  });
});

describe('isPathAllowed', () => {
  it('should allow paths within whitelist', () => {
    expect(isPathAllowed('/home/user/projects/app', ['/home/user/projects'])).toBe(true);
  });

  it('should allow exact match', () => {
    expect(isPathAllowed('/home/user/projects', ['/home/user/projects'])).toBe(true);
  });

  it('should reject paths outside whitelist', () => {
    expect(isPathAllowed('/etc/passwd', ['/home/user/projects'])).toBe(false);
  });

  it('should reject path traversal', () => {
    expect(isPathAllowed('/home/user/projects/../../etc', ['/home/user/projects'])).toBe(false);
  });

  it('should allow everything when whitelist is empty', () => {
    expect(isPathAllowed('/any/path', [])).toBe(true);
  });

  it('should handle multiple allowed dirs', () => {
    const allowed = ['/home/user/projects', '/home/user/work'];
    expect(isPathAllowed('/home/user/work/app', allowed)).toBe(true);
    expect(isPathAllowed('/home/user/projects/app', allowed)).toBe(true);
    expect(isPathAllowed('/home/user/secret', allowed)).toBe(false);
  });

  it('should handle ~ paths', () => {
    expect(isPathAllowed('~/projects/app', ['~/projects'])).toBe(true);
  });
});
