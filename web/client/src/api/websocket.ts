/**
 * WebSocket 客户端封装
 * 提供自动重连、事件订阅/取消订阅功能
 */

const WS_URL = 'ws://localhost:10010';
const RECONNECT_DELAY = 3000; // 3 秒后重连
const HEARTBEAT_INTERVAL = 30000; // 30 秒心跳

export type WebSocketEventType =
  | 'analysis_complete'
  | 'analysis_failed'
  | 'new_suggestions'
  | 'suggestion_approved'
  | 'suggestion_rejected'
  | 'config_changed'
  | 'system_error';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  timestamp: string;
}

type EventListener = (message: WebSocketMessage) => void;
type ConnectionListener = (connected: boolean) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private eventListeners: Map<WebSocketEventType, Set<EventListener>> = new Map();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private isManualClose = false;
  private connected = false;

  constructor() {
    this.connect();
  }

  /**
   * 连接 WebSocket 服务器
   */
  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[WebSocket] 已连接');
        this.connected = true;
        this.notifyConnectionListeners(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] 解析消息失败:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] 连接关闭');
        this.connected = false;
        this.notifyConnectionListeners(false);
        this.stopHeartbeat();

        // 如果不是手动关闭，则自动重连
        if (!this.isManualClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] 错误:', error);
      };
    } catch (error) {
      console.error('[WebSocket] 连接失败:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      console.log('[WebSocket] 尝试重连...');
      this.connect();
    }, RECONNECT_DELAY);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: WebSocketMessage) {
    // 忽略 pong 消息
    if (message.type === 'pong' as any) {
      return;
    }

    console.log('[WebSocket] 收到消息:', message);

    // 通知对应类型的监听器
    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      listeners.forEach((listener) => listener(message));
    }
  }

  /**
   * 通知连接状态监听器
   */
  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach((listener) => listener(connected));
  }

  /**
   * 订阅事件
   */
  on(eventType: WebSocketEventType, listener: EventListener): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this.off(eventType, listener);
    };
  }

  /**
   * 取消订阅事件
   */
  off(eventType: WebSocketEventType, listener: EventListener) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 订阅连接状态变化
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);

    // 立即通知当前状态
    listener(this.connected);

    // 返回取消订阅函数
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 关闭连接
   */
  close() {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 单例模式
export const wsClient = new WebSocketClient();
