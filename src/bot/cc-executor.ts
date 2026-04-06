/**
 * Claude Code CLI 执行器
 * spawn claude -p 子进程，解析 JSON 输出
 */

import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { existsSync, statSync } from 'fs';
import { logToFile } from './file-logger.js';

export interface CCExecuteOptions {
  prompt: string;
  cwd: string;
  timeoutMs?: number;
  maxBudgetUsd?: number;
  systemPrompt?: string;
  permissionMode?: string;
  baseURL?: string;
}

export interface CCExecuteResult {
  success: boolean;
  result?: string;
  error?: string;
  costUsd?: number;
  durationMs: number;
}

/** 展开 ~ 到 home 目录，并返回绝对路径 */
export function expandHome(p: string): string {
  if (p === '~') {
    return os.homedir();
  }
  if (p.startsWith('~/')) {
    // 使用 path.join 而不是 replace，更健壮
    return path.join(os.homedir(), p.slice(2));
  }
  // 确保返回绝对路径
  return path.resolve(p);
}

/**
 * 验证 cwd 是否有效（存在且为目录）
 * @returns { valid: boolean, error?: string, expandedPath?: string }
 */
export function validateCwd(cwd: string): {
  valid: boolean;
  error?: string;
  expandedPath?: string;
} {
  try {
    const expanded = expandHome(cwd);

    // 检查路径是否存在
    if (!existsSync(expanded)) {
      return {
        valid: false,
        error: `Directory does not exist: ${expanded} (original: ${cwd})`,
      };
    }

    // 检查是否为目录
    const stats = statSync(expanded);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: `Path is not a directory: ${expanded} (original: ${cwd})`,
      };
    }

    return { valid: true, expandedPath: expanded };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      error: `Failed to validate cwd: ${errorMsg} (path: ${cwd})`,
    };
  }
}

/** 执行 claude -p 子进程 */
export async function executeCC(options: CCExecuteOptions): Promise<CCExecuteResult> {
  const {
    prompt,
    cwd,
    timeoutMs = 120_000,
    maxBudgetUsd = 0.5,
    systemPrompt,
    permissionMode = 'bypassPermissions',
    baseURL,
  } = options;

  const startTime = Date.now();
  const args = [
    '-p',
    '--output-format', 'json',
    '--permission-mode', permissionMode,
    '--max-budget-usd', maxBudgetUsd.toString(),
    // 移除 --no-session-persistence，可能导致进程卡住
    // '--no-session-persistence',
  ];

  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt);
  }

  args.push(prompt);

  const env = { ...process.env };
  if (baseURL) {
    env.ANTHROPIC_BASE_URL = baseURL;
  }

  // 验证 cwd
  const validation = validateCwd(cwd);
  if (!validation.valid) {
    logToFile('[executeCC] CWD validation failed:', validation.error);
    return Promise.resolve({
      success: false,
      error: `Invalid working directory: ${validation.error}`,
      durationMs: Date.now() - startTime,
    });
  }

  const expandedCwd = validation.expandedPath!;
  logToFile('[executeCC] Using cwd:', expandedCwd);

  return new Promise<CCExecuteResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    logToFile('[executeCC] Spawn config:', {
      command: 'claude',
      args,
      cwd: expandedCwd,
      timeout: timeoutMs,
    });

    const child = spawn('claude', args, {
      cwd: expandedCwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'], // stdin 改为 pipe 以便立即关闭
      shell: false, // 直接执行，避免通过 shell 导致进程分离
      detached: false, // 确保子进程跟随父进程退出
    });

    logToFile('[CC Executor] 进程已启动:', { pid: child.pid });

    // 写入换行符后关闭 stdin，让 Claude Code 收到 EOF
    if (child.stdin) {
      child.stdin.write('\n');
      child.stdin.end();
      logToFile('[CC Executor] stdin 已写入换行符并关闭');
    }

    const timer = setTimeout(() => {
      killed = true;
      logToFile('[CC Executor] 执行超时，发送 SIGTERM:', { pid: child.pid });
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          logToFile('[CC Executor] SIGTERM 无效，发送 SIGKILL:', { pid: child.pid });
          child.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      logToFile('[CC Executor] 收到 stdout:', { bytes: chunk.length, preview: chunk.toString().slice(0, 100) });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      logToFile('[CC Executor] 收到 stderr:', chunk.toString().slice(0, 200));
    });

    child.on('exit', (code, signal) => {
      logToFile('[CC Executor] exit 事件:', { code, signal, pid: child.pid });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      logToFile('[executeCC] Spawn error:', {
        error: err.message,
        code: (err as NodeJS.ErrnoException).code,
        errno: (err as NodeJS.ErrnoException).errno,
        syscall: (err as NodeJS.ErrnoException).syscall,
        path: (err as NodeJS.ErrnoException).path,
        cwd: expandedCwd,
      });
      resolve({
        success: false,
        error: err.message.includes('ENOENT')
          ? 'claude 命令未找到，请确认 Claude Code CLI 已安装并在 PATH 中'
          : `执行失败: ${err.message}`,
        durationMs: Date.now() - startTime,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      logToFile('[CC Executor] 进程退出:', {
        code,
        killed,
        durationMs,
        stdoutBytes: stdout.length,
      });

      if (killed) {
        return resolve({
          success: false,
          error: `执行超时 (${Math.round(timeoutMs / 1000)}s)`,
          durationMs,
        });
      }

      // 尝试解析 JSON 输出
      const parsed = parseOutput(stdout);

      // 仅当退出码是非零数值且没有解析到结果时才认为失败
      // null 退出码（进程正常退出但未设置退出码）视为成功
      if (typeof code === 'number' && code !== 0 && !parsed.result) {
        return resolve({
          success: false,
          error: parsed.error || stderr.slice(0, 500) || `进程退出码 ${code}`,
          durationMs,
        });
      }

      resolve({
        success: true,
        result: parsed.result,
        costUsd: parsed.costUsd,
        durationMs,
      });
    });
  });
}

interface ParsedOutput {
  result?: string;
  error?: string;
  costUsd?: number;
}

function parseOutput(stdout: string): ParsedOutput {
  const trimmed = stdout.trim();
  if (!trimmed) return {};

  try {
    const json = JSON.parse(trimmed);
    // claude -p --output-format json 返回格式
    if (json.result !== undefined) {
      return {
        result: typeof json.result === 'string' ? json.result : JSON.stringify(json.result),
        costUsd: json.cost_usd ?? json.costUsd,
      };
    }
    // 可能直接返回文本
    if (json.content) {
      const textBlocks = Array.isArray(json.content)
        ? json.content.filter((b: any) => b.type === 'text').map((b: any) => b.text)
        : [json.content];
      return { result: textBlocks.join('\n') };
    }
    // fallback: 整个 JSON 作为结果
    return { result: JSON.stringify(json, null, 2) };
  } catch {
    // 非 JSON 输出，直接用原始文本
    return { result: trimmed };
  }
}
