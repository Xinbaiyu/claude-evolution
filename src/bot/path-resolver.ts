/**
 * 工作目录解析 + 白名单验证
 */

import path from 'path';
import { expandHome } from './cc-executor.js';

export interface PathResolveResult {
  cwd: string;
  prompt: string;
}

/**
 * 从消息中提取工作目录和实际 prompt
 *
 * 支持格式:
 * - "在 ~/projects/myapp 帮我看下bug" → cwd: ~/projects/myapp, prompt: "帮我看下bug"
 * - "在~/projects/myapp下 帮我看下" → cwd: ~/projects/myapp, prompt: "帮我看下"
 * - "cd ~/projects && 帮我看下" → cwd: ~/projects, prompt: "帮我看下"
 * - "帮我看下bug" → cwd: defaultCwd, prompt: "帮我看下bug"
 */
export function resolveWorkingDir(content: string, defaultCwd: string): PathResolveResult {
  // 匹配 "在 <path> <prompt>" 或 "在<path>下 <prompt>"
  const zhMatch = content.match(/^在\s*(\/[^\s下]+|~\/[^\s下]+)下?\s+(.+)$/s);
  if (zhMatch) {
    return { cwd: zhMatch[1], prompt: zhMatch[2].trim() };
  }

  // 匹配 "cd <path> && <prompt>" 或 "cd <path> <prompt>"
  const cdMatch = content.match(/^cd\s+(\/[^\s]+|~\/[^\s]+)\s*(?:&&|\s)\s*(.+)$/s);
  if (cdMatch) {
    return { cwd: cdMatch[1], prompt: cdMatch[2].trim() };
  }

  return { cwd: defaultCwd, prompt: content };
}

/**
 * 验证路径是否在白名单中
 * 白名单中的路径是允许的前缀
 */
export function isPathAllowed(targetPath: string, allowedDirs: string[]): boolean {
  if (allowedDirs.length === 0) return true;

  const resolved = path.resolve(expandHome(targetPath));

  return allowedDirs.some((allowed) => {
    const resolvedAllowed = path.resolve(expandHome(allowed));
    return resolved === resolvedAllowed || resolved.startsWith(resolvedAllowed + '/');
  });
}
