import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import suggestionsRouter from './routes/suggestions.js';
import systemRouter from './routes/system.js';
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

app.use('/api', suggestionsRouter);
app.use('/api', systemRouter);

// 静态文件服务（前端构建产物）
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

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

// 启动服务器
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Web server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
  });
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wsManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server, wsManager, notificationManager };
