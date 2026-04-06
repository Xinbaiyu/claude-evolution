/**
 * Simple file logger for bot adapter
 * Writes logs to a file since console.log is suppressed when daemon runs with stdio: 'ignore'
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

const LOG_DIR = path.join(homedir(), '.claude-evolution/logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

let initialized = false;
let initError: Error | null = null;

function ensureLogDir(): void {
  if (initialized) return;

  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    initialized = true;
  } catch (error) {
    initError = error as Error;
    // Try to log to stderr as last resort
    process.stderr?.write?.(`[file-logger] Failed to create log directory: ${error}\n`);
  }
}

export function logToFile(message: string, ...args: unknown[]): void {
  ensureLogDir();

  if (initError) {
    // Don't spam on every log call after first error
    return;
  }

  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message} ${args.map(a => JSON.stringify(a, null, 2)).join(' ')}\n`;
  try {
    appendFileSync(LOG_FILE, fullMessage, 'utf-8');
  } catch (error) {
    // Only log the first write error
    if (!initError) {
      initError = error as Error;
      // Try to write error to a separate error log file
      const errorLog = path.join(LOG_DIR, 'bot-error.log');
      try {
        appendFileSync(errorLog, `[${timestamp}] LOGGER ERROR: ${error}\n${(error as Error).stack}\n`, 'utf-8');
      } catch {
        // Really can't do anything now
      }
    }
  }
}
