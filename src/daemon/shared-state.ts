import { EventEmitter } from 'events';

/**
 * 调度器状态
 */
export interface SchedulerState {
  isRunning: boolean;
  lastExecution: Date | null;
  nextExecution: Date | null;
  totalExecutions: number;
}

/**
 * Web 服务器状态
 */
export interface WebServerState {
  isRunning: boolean;
  port: number;
  activeConnections: number;
}

/**
 * 建议统计
 */
export interface SuggestionsStats {
  pending: number;
  approved: number;
  rejected: number;
}

/**
 * 守护进程完整状态
 */
export interface DaemonState {
  scheduler: SchedulerState;
  webServer: WebServerState;
  suggestions: SuggestionsStats;
}

/**
 * 事件总线类型
 */
export interface DaemonEvents {
  'scheduler:executed': (data: { timestamp: Date; duration: number }) => void;
  'scheduler:started': () => void;
  'scheduler:stopped': () => void;
  'webserver:started': (data: { port: number }) => void;
  'webserver:stopped': () => void;
  'suggestions:updated': (stats: SuggestionsStats) => void;
}

/**
 * 守护进程事件总线
 */
export class DaemonEventBus extends EventEmitter {
  // TypeScript 类型安全的 emit/on
  emit<K extends keyof DaemonEvents>(
    event: K,
    ...args: Parameters<DaemonEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof DaemonEvents>(
    event: K,
    listener: DaemonEvents[K]
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof DaemonEvents>(
    event: K,
    listener: DaemonEvents[K]
  ): this {
    return super.once(event, listener);
  }

  off<K extends keyof DaemonEvents>(
    event: K,
    listener: DaemonEvents[K]
  ): this {
    return super.off(event, listener);
  }
}

/**
 * 创建默认守护进程状态
 */
export function createDefaultDaemonState(): DaemonState {
  return {
    scheduler: {
      isRunning: false,
      lastExecution: null,
      nextExecution: null,
      totalExecutions: 0,
    },
    webServer: {
      isRunning: false,
      port: 0,
      activeConnections: 0,
    },
    suggestions: {
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  };
}

/**
 * 共享状态管理器
 */
export class SharedStateManager {
  private state: DaemonState;
  private eventBus: DaemonEventBus;

  constructor() {
    this.state = createDefaultDaemonState();
    this.eventBus = new DaemonEventBus();
  }

  /**
   * 获取当前状态（只读）
   */
  getState(): Readonly<DaemonState> {
    return this.state;
  }

  /**
   * 获取事件总线
   */
  getEventBus(): DaemonEventBus {
    return this.eventBus;
  }

  /**
   * 更新调度器状态
   */
  updateScheduler(updates: Partial<SchedulerState>): void {
    this.state.scheduler = {
      ...this.state.scheduler,
      ...updates,
    };
  }

  /**
   * 记录调度器执行
   */
  recordSchedulerExecution(duration: number): void {
    const now = new Date();

    this.state.scheduler.lastExecution = now;
    this.state.scheduler.totalExecutions += 1;

    // 触发事件
    this.eventBus.emit('scheduler:executed', {
      timestamp: now,
      duration,
    });
  }

  /**
   * 启动调度器
   */
  startScheduler(nextExecution: Date): void {
    this.state.scheduler.isRunning = true;
    this.state.scheduler.nextExecution = nextExecution;
    this.eventBus.emit('scheduler:started');
  }

  /**
   * 停止调度器
   */
  stopScheduler(): void {
    this.state.scheduler.isRunning = false;
    this.state.scheduler.nextExecution = null;
    this.eventBus.emit('scheduler:stopped');
  }

  /**
   * 更新 Web 服务器状态
   */
  updateWebServer(updates: Partial<WebServerState>): void {
    this.state.webServer = {
      ...this.state.webServer,
      ...updates,
    };
  }

  /**
   * 启动 Web 服务器
   */
  startWebServer(port: number): void {
    this.state.webServer.isRunning = true;
    this.state.webServer.port = port;
    this.eventBus.emit('webserver:started', { port });
  }

  /**
   * 停止 Web 服务器
   */
  stopWebServer(): void {
    this.state.webServer.isRunning = false;
    this.state.webServer.port = 0;
    this.eventBus.emit('webserver:stopped');
  }

  /**
   * 更新建议统计
   */
  updateSuggestions(stats: SuggestionsStats): void {
    this.state.suggestions = stats;
    this.eventBus.emit('suggestions:updated', stats);
  }
}

// 导出全局单例（在守护进程中使用）
export const sharedState = new SharedStateManager();
