import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface WSClient extends WebSocket {
  isAlive: boolean;
  id: string;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WSClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupConnectionHandling();
    this.startHeartbeat();
  }

  private setupConnectionHandling() {
    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as WSClient;
      client.isAlive = true;
      client.id = this.generateClientId();

      this.clients.add(client);
      console.log(`[WS] Client connected: ${client.id} (total: ${this.clients.size})`);

      // 发送欢迎消息
      this.sendToClient(client, {
        type: 'connected',
        data: {
          clientId: client.id,
          timestamp: new Date().toISOString(),
        },
      });

      // 处理 pong 响应
      client.on('pong', () => {
        client.isAlive = true;
      });

      // 处理客户端消息
      client.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(client, data);
        } catch (error) {
          console.error('[WS] Invalid message from client:', error);
        }
      });

      // 处理断开连接
      client.on('close', () => {
        this.clients.delete(client);
        console.log(`[WS] Client disconnected: ${client.id} (total: ${this.clients.size})`);
      });

      // 处理错误
      client.on('error', (error) => {
        console.error(`[WS] Client error (${client.id}):`, error);
      });
    });
  }

  private handleClientMessage(client: WSClient, data: any) {
    console.log(`[WS] Message from ${client.id}:`, data);

    // 处理 ping
    if (data.type === 'ping') {
      this.sendToClient(client, { type: 'pong', timestamp: new Date().toISOString() });
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          console.log(`[WS] Terminating inactive client: ${client.id}`);
          this.clients.delete(client);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 秒心跳
  }

  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToClient(client: WSClient, message: any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // 广播消息给所有连接的客户端
  public broadcast(event: string, data: any) {
    const message = {
      type: event,
      data,
      timestamp: new Date().toISOString(),
    };

    console.log(`[WS] Broadcasting ${event} to ${this.clients.size} clients`);

    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  // 发送分析完成事件
  public emitAnalysisComplete(stats: any) {
    this.broadcast('analysis_complete', stats);
  }

  // Legacy suggestion events (DEPRECATED - will be removed in v0.5.0)
  /**
   * @deprecated Use observation events instead
   */
  public emitNewSuggestions(suggestions: any[]) {
    this.broadcast('new_suggestions', {
      count: suggestions.length,
      suggestions: suggestions.slice(0, 5), // 只发送前 5 条预览
    });
  }

  // Observation events
  public emitObservationPromoted(observation: any) {
    this.broadcast('observation_promoted', observation);
  }

  public emitObservationDemoted(observation: any) {
    this.broadcast('observation_demoted', observation);
  }

  public emitObservationArchived(observation: any) {
    this.broadcast('observation_archived', observation);
  }

  public emitObservationRestored(observation: any) {
    this.broadcast('observation_restored', observation);
  }

  public emitConfigChanged(data: { changedKeys: string[]; schedulerChanged: boolean }) {
    this.broadcast('config_changed', data);
  }

  // 清理资源
  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
  }
}
