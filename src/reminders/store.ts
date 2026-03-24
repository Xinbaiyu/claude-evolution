/**
 * 提醒持久化存储
 * 使用 JSON 文件存储，串行写入队列防并发
 */

import fs from 'fs-extra';
import path from 'path';
import { getEvolutionDir } from '../config/loader.js';
import type { Reminder } from './types.js';

function getStorePath(): string {
  return path.join(getEvolutionDir(), 'reminders.json');
}

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(fn, fn);
  return writeQueue;
}

export async function loadReminders(): Promise<Reminder[]> {
  const storePath = getStorePath();
  if (!(await fs.pathExists(storePath))) {
    return [];
  }
  try {
    return await fs.readJSON(storePath);
  } catch {
    return [];
  }
}

export async function saveReminders(reminders: readonly Reminder[]): Promise<void> {
  return enqueueWrite(async () => {
    const storePath = getStorePath();
    await fs.ensureDir(path.dirname(storePath));
    await fs.writeJSON(storePath, reminders, { spaces: 2 });
  });
}
