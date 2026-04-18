import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import systemRouter from './routes/system.js';
import sourceRouter from './routes/source.js';
import learningRouter from './routes/learning.js';
import analysisLogsRouter from './routes/analysis-logs.js';
import statsRouter from './routes/stats.js';
import remindersRouter from './routes/reminders.js';
import versionUpdateRouter from './routes/version-update.js';
import { WebSocketManager } from './websocket.js';
import { NotificationManager } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10010;

// 中间件
app.use(cors());
app.use(express.json());

// 创建 HTTP 服务器（需要先创建才能初始化 WebSocket）
const server = createServer(app);

// 创建 WebSocket 管理器
const wsManager = new WebSocketManager(server);

// 创建通知管理器
const notificationManager = new NotificationManager(PORT as number);

// 将 wsManager 和 notificationManager 注入到请求中
app.use((req: any, res: Response, next: NextFunction) => {
  req.wsManager = wsManager;
  req.notificationManager = notificationManager;
  if (reminderServiceInstance) {
    req.reminderService = reminderServiceInstance;
  }
  next();
});

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API 路由
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', systemRouter);
app.use('/api/source', sourceRouter);
app.use('/api/learning', learningRouter);
app.use('/api', analysisLogsRouter);
app.use('/api', statsRouter);
app.use('/api', remindersRouter);
app.use('/api/version-update', versionUpdateRouter);

// 静态文件服务（前端构建产物）
// 使用 __dirname 相对路径定位，确保全局安装后在任意目录都能找到静态资源
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath, {
  // 禁用缓存，确保每次都获取最新文件
  maxAge: 0,
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// SPA fallback - 所有未匹配的路由返回 index.html
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 导出启动函数（不自动启动）
export function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`🚀 Web server running at http://localhost:${port}`);
      console.log(`📡 WebSocket server ready`);
      resolve();
    });

    server.on('error', (error) => {
      reject(error);
    });
  });
}

// 仅在直接运行时启动（node web/server/index.js）
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer(PORT as number).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// 优雅关闭处理
export function closeServer(): Promise<void> {
  return new Promise((resolve) => {
    wsManager.close();
    server.close(() => {
      console.log('Server closed');
      resolve();
    });
  });
}

// 调度器配置变更回调注册
type SchedulerConfigChangedCallback = () => Promise<void>;
let schedulerConfigChangedCallback: SchedulerConfigChangedCallback | null = null;

// Agent 配置变更回调注册
type AgentConfigChangedCallback = () => Promise<void>;
let agentConfigChangedCallback: AgentConfigChangedCallback | null = null;

// ReminderService 注入
let reminderServiceInstance: any = null;

export function setReminderService(service: any): void {
  reminderServiceInstance = service;
}

export function onSchedulerConfigChanged(callback: SchedulerConfigChangedCallback): void {
  schedulerConfigChangedCallback = callback;
}

export function triggerSchedulerConfigChanged(): void {
  if (schedulerConfigChangedCallback) {
    schedulerConfigChangedCallback().catch((error) => {
      console.error('[Config] Scheduler reload failed:', error);
    });
  }
}

export function onAgentConfigChanged(callback: AgentConfigChangedCallback): void {
  agentConfigChangedCallback = callback;
}

export function triggerAgentConfigChanged(): void {
  if (agentConfigChangedCallback) {
    agentConfigChangedCallback().catch((error) => {
      console.error('[Config] Agent reload failed:', error);
    });
  }
}

export { app, server, wsManager, notificationManager };
