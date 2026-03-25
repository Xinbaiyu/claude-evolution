/**
 * Claude Code CLI 执行器
 * spawn claude -p 子进程，解析 JSON 输出
 */

import { spawn } from 'child_process';
import os from 'os';

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

/** 展开 ~ 到 home 目录 */
export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return p.replace('~', os.homedir());
  }
  return p;
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
    '--no-session-persistence',
  ];

  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt);
  }

  args.push(prompt);

  const env = { ...process.env };
  if (baseURL) {
    env.ANTHROPIC_BASE_URL = baseURL;
  }

  return new Promise<CCExecuteResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    console.log(`[CC Executor] 启动 claude -p (cwd: ${expandHome(cwd)}, timeout: ${timeoutMs}ms)`);

    const child = spawn('claude', args, {
      cwd: expandHome(cwd),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 5000);
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      console.log(`[CC Executor] stderr: ${chunk.toString().slice(0, 200)}`);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
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
      console.log(`[CC Executor] 进程退出 code=${code} killed=${killed} duration=${durationMs}ms stdout=${stdout.length}bytes`);

      if (killed) {
        return resolve({
          success: false,
          error: `执行超时 (${Math.round(timeoutMs / 1000)}s)`,
          durationMs,
        });
      }

      // 尝试解析 JSON 输出
      const parsed = parseOutput(stdout);

      if (code !== 0 && !parsed.result) {
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
