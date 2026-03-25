/**
 * 群聊上下文记忆 — 滑动窗口 + 超时过期
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistory {
  messages: ChatMessage[];
  lastActivity: number;
}

const DEFAULT_WINDOW_SIZE = 20;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟

export class ChatContextManager {
  private readonly store = new Map<string, ChatHistory>();
  private readonly windowSize: number;
  private readonly timeoutMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(windowSize: number = DEFAULT_WINDOW_SIZE, timeoutMinutes: number = 30) {
    this.windowSize = windowSize;
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.startCleanup();
  }

  /** 获取群聊历史 */
  getHistory(chatId: string): ChatMessage[] {
    const history = this.store.get(chatId);
    if (!history) return [];

    // 超时检查
    if (Date.now() - history.lastActivity > this.timeoutMs) {
      this.store.delete(chatId);
      return [];
    }

    return [...history.messages];
  }

  /** 添加消息到群聊历史 */
  addMessage(chatId: string, role: 'user' | 'assistant', content: string): void {
    const history = this.store.get(chatId) || { messages: [], lastActivity: 0 };

    history.messages.push({ role, content });
    history.lastActivity = Date.now();

    // 滑动窗口：超出大小丢弃最早的
    if (history.messages.length > this.windowSize) {
      history.messages = history.messages.slice(-this.windowSize);
    }

    this.store.set(chatId, history);
  }

  /** 清空群聊上下文 */
  clear(chatId: string): void {
    this.store.delete(chatId);
  }

  /** 清空所有上下文 */
  clearAll(): void {
    this.store.clear();
  }

  /** 获取活跃群聊数 */
  get size(): number {
    return this.store.size;
  }

  /** 停止定时清理 */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [chatId, history] of this.store) {
        if (now - history.lastActivity > this.timeoutMs) {
          this.store.delete(chatId);
        }
      }
    }, CLEANUP_INTERVAL_MS);

    // 不阻止进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}
