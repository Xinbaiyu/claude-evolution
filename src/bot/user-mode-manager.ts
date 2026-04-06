/**
 * 用户模式偏好管理器
 *
 * 负责存储和管理每个用户（chatId）的工作模式偏好（Agent 或 Chat）
 * 持久化到磁盘，重启后保持
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

export type BotMode = 'agent' | 'chat';

export interface UserModePreferences {
  [chatId: string]: {
    mode: BotMode;
    lastSwitchTime: string; // ISO timestamp
  };
}

export class UserModePreferenceManager {
  private preferences: UserModePreferences = {};
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || join(homedir(), '.claude-evolution/user-mode-preferences.json');
    this.load();
  }

  /**
   * 获取指定用户的当前模式
   * @param chatId 用户的 chatId
   * @returns 当前模式，未设置时默认返回 'chat'
   */
  getMode(chatId: string): BotMode {
    return this.preferences[chatId]?.mode || 'chat';
  }

  /**
   * 设置指定用户的模式
   * @param chatId 用户的 chatId
   * @param mode 新的模式
   */
  setMode(chatId: string, mode: BotMode): void {
    this.preferences[chatId] = {
      mode,
      lastSwitchTime: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * 从磁盘加载偏好配置
   */
  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const content = readFileSync(this.filePath, 'utf-8');
        this.preferences = JSON.parse(content);
      }
    } catch (error) {
      console.error('[UserModePreferenceManager] 加载偏好配置失败:', error);
      this.preferences = {};
    }
  }

  /**
   * 保存偏好配置到磁盘
   */
  private save(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.preferences, null, 2), 'utf-8');
    } catch (error) {
      console.error('[UserModePreferenceManager] 保存偏好配置失败:', error);
    }
  }
}
