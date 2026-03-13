# Claude Evolution 部署指南

**版本**: 0.1.0
**更新时间**: 2026-03-13

---

## 📋 目录

- [1. 环境要求](#1-环境要求)
- [2. 本地开发环境](#2-本地开发环境)
- [3. CLI 工具安装](#3-cli-工具安装)
- [4. Web UI 部署](#4-web-ui-部署)
- [5. 配置管理](#5-配置管理)
- [6. 故障排查](#6-故障排查)
- [7. 日志管理](#7-日志管理)
- [8. 备份与恢复](#8-备份与恢复)
- [9. 性能调优](#9-性能调优)
- [10. 安全加固](#10-安全加固)

---

## 1. 环境要求

### 1.1 系统要求

| 要求 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **操作系统** | macOS 10.15+ | macOS 13+ | 支持 Linux/Windows (WSL2) |
| **Node.js** | 18.0.0 | 20.0.0+ | LTS 版本 |
| **npm** | 9.0.0 | 10.0.0+ | 或使用 pnpm/yarn |
| **内存** | 2 GB | 4 GB+ | 运行 Web UI 需要更多内存 |
| **磁盘空间** | 500 MB | 1 GB+ | 包括日志和会话数据 |

### 1.2 依赖服务

| 服务 | 用途 | 是否必需 | 说明 |
|------|------|---------|------|
| **claude-mem MCP** | 会话数据源 | 是 | 必须先安装并运行 |
| **Anthropic API** | LLM 服务 | 是 | 需要 API Key |

### 1.3 验证环境

```bash
# 检查 Node.js 版本
node --version  # 应显示 v18.0.0 或更高

# 检查 npm 版本
npm --version   # 应显示 9.0.0 或更高

# 检查 claude-mem 是否运行
curl http://localhost:3000/health  # 应返回 200 OK
```

---

## 2. 本地开发环境

### 2.1 克隆仓库

```bash
# 克隆项目
git clone https://github.com/your-username/claude-evolution.git
cd claude-evolution

# 查看分支
git branch -a

# 切换到开发分支 (如果有)
git checkout develop
```

### 2.2 安装依赖

```bash
# 安装根目录依赖 (后端)
npm install

# 安装 Web UI 依赖 (前端)
cd web/client
npm install
cd ../..
```

**注意**: 如果遇到依赖冲突,尝试:

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json
rm -rf web/client/node_modules web/client/package-lock.json

# 重新安装
npm install
cd web/client && npm install && cd ../..
```

### 2.3 配置环境变量

创建 `.env` 文件:

```bash
# 创建环境变量文件
cat > .env <<EOF
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Web Server
PORT=10010

# Development
NODE_ENV=development
DEBUG=claude-evolution:*
EOF
```

**重要**: 将 `.env` 添加到 `.gitignore`:

```bash
echo ".env" >> .gitignore
```

### 2.4 编译 TypeScript

```bash
# 编译后端代码
npm run build

# 编译 Web UI
cd web/client
npm run build
cd ../..
```

**输出**:

```
dist/                    # 后端编译产物
web/client/dist/         # 前端编译产物
```

### 2.5 运行开发服务器

**方式 1: 分别运行** (推荐开发时使用)

```bash
# 终端 1: 运行 CLI 开发模式 (热重载)
npm run dev

# 终端 2: 运行 Web Server 开发模式
npm run dev:server

# 终端 3: 运行 Web UI 开发模式
cd web/client
npm run dev
```

**方式 2: 生产模式运行**

```bash
# 先编译
npm run build

# 运行 Web Server (包含静态文件服务)
node dist/web/server/index.js
```

**验证**:

- CLI: `./dist/cli/index.js status`
- Web Server: `curl http://localhost:10010/api/health`
- Web UI: 浏览器访问 `http://localhost:10010`

---

## 3. CLI 工具安装

### 3.1 全局安装 (推荐)

**方式 1: 从源码安装**

```bash
# 在项目根目录
npm run build
npm link

# 验证安装
claude-evolution --version  # 应显示 0.1.0
claude-evolution --help
```

**卸载**:

```bash
npm unlink -g claude-evolution
```

---

**方式 2: 从 npm 安装** (如果已发布)

```bash
# 全局安装
npm install -g claude-evolution

# 验证安装
claude-evolution --version
```

**卸载**:

```bash
npm uninstall -g claude-evolution
```

---

### 3.2 本地使用 (不安装)

```bash
# 编译项目
npm run build

# 直接运行 (使用相对路径)
./dist/cli/index.js status

# 或使用 npm script
npm run dev -- status
```

### 3.3 初始化配置

```bash
# 初始化系统
claude-evolution init

# 查看配置目录
ls -la ~/.claude-evolution/
```

**输出**:

```
~/.claude-evolution/
├── config.json          # 系统配置
├── state.json           # 系统状态
├── source/
│   └── CLAUDE.md        # 原始配置 (如果存在)
├── learned/             # 学习成果 (空)
├── suggestions/         # 建议 (空)
└── logs/                # 日志 (空)
```

### 3.4 配置 API Key

```bash
# 方式 1: 环境变量 (推荐)
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# 方式 2: 写入配置文件
claude-evolution config set llm.apiKey sk-ant-api03-xxxxx

# 验证配置
claude-evolution config list
```

---

## 4. Web UI 部署

### 4.1 开发模式部署

**适用场景**: 本地开发、快速预览

```bash
# 终端 1: 运行 Web Server
npm run dev:server

# 终端 2: 运行 Web UI (Vite 开发服务器)
cd web/client
npm run dev
```

**访问**:

- 开发模式 (Vite): `http://localhost:5173`
- API 端点: `http://localhost:10010/api`

**优点**:
- ✅ 热重载 (HMR)
- ✅ 快速开发
- ✅ 详细错误提示

**缺点**:
- ❌ 需要两个终端
- ❌ 不适合生产环境

---

### 4.2 生产模式部署

**适用场景**: 本地长期使用、生产环境

#### 步骤 1: 构建项目

```bash
# 构建后端和前端
npm run build
```

**输出**:

```
✓ 编译后端代码                  dist/
✓ 编译 Web UI                   web/client/dist/
  - index.html (0.45 kB)
  - assets/index-*.css (15.19 kB → 3.70 kB gzip)
  - assets/index-*.js (225.89 kB → 68.19 kB gzip)
```

#### 步骤 2: 运行 Web Server

```bash
# 直接运行
node dist/web/server/index.js

# 或使用 npm script
npm start  # (需要在 package.json 添加 "start" script)
```

**访问**: `http://localhost:10010`

**验证**:

```bash
# 检查服务器状态
curl http://localhost:10010/api/health

# 检查前端资源
curl http://localhost:10010/ | grep "<!DOCTYPE html>"
```

---

### 4.3 使用进程管理器 (PM2)

**推荐**: 生产环境使用 PM2 管理进程

#### 安装 PM2

```bash
npm install -g pm2
```

#### 创建 PM2 配置文件

```bash
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [
    {
      name: 'claude-evolution',
      script: './dist/web/server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 10010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 10010
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
```

#### 启动服务

```bash
# 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs claude-evolution

# 监控
pm2 monit

# 停止
pm2 stop claude-evolution

# 重启
pm2 restart claude-evolution

# 开机自启
pm2 startup
pm2 save
```

---

### 4.4 使用 Docker 部署 (可选)

**创建 Dockerfile**:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./
COPY web/client/package*.json ./web/client/

# 安装依赖
RUN npm install --production
RUN cd web/client && npm install --production

# 复制源码
COPY . .

# 构建
RUN npm run build

# 暴露端口
EXPOSE 10010

# 启动
CMD ["node", "dist/web/server/index.js"]
```

**构建和运行**:

```bash
# 构建镜像
docker build -t claude-evolution:0.1.0 .

# 运行容器
docker run -d \
  --name claude-evolution \
  -p 10010:10010 \
  -v ~/.claude-evolution:/root/.claude-evolution \
  -e ANTHROPIC_API_KEY=sk-ant-api03-xxxxx \
  claude-evolution:0.1.0

# 查看日志
docker logs -f claude-evolution

# 停止
docker stop claude-evolution
```

---

### 4.5 反向代理配置 (Nginx)

**适用场景**: 生产环境、HTTPS、域名访问

#### Nginx 配置

```nginx
# /etc/nginx/sites-available/claude-evolution
server {
    listen 80;
    server_name evolution.example.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name evolution.example.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/evolution.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/evolution.example.com/privkey.pem;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 反向代理到 Node.js
    location / {
        proxy_pass http://localhost:10010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:10010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        proxy_pass http://localhost:10010;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**启用配置**:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/claude-evolution /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 5. 配置管理

### 5.1 配置文件位置

| 文件 | 路径 | 用途 |
|------|------|------|
| **系统配置** | `~/.claude-evolution/config.json` | 主配置文件 |
| **系统状态** | `~/.claude-evolution/state.json` | 运行状态 |
| **环境变量** | `.env` (项目根目录) | 敏感信息 |

### 5.2 配置文件结构

**config.json**:

```json
{
  "scheduler": {
    "enabled": false,
    "interval": "1h"
  },
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "maxTokens": 4096,
    "temperature": 0.3,
    "enablePromptCaching": false
  },
  "learningPhases": {
    "observation": {
      "durationDays": 3
    },
    "suggestion": {
      "durationDays": 4
    },
    "automatic": {
      "confidenceThreshold": 0.8
    }
  }
}
```

### 5.3 常用配置修改

**启用定时调度**:

```bash
claude-evolution config set scheduler.enabled true
claude-evolution config set scheduler.interval 2h
```

**修改 LLM 模型**:

```bash
# 使用 Sonnet (更智能但更贵)
claude-evolution config set llm.model claude-3-5-sonnet-20241022

# 使用 Haiku (更便宜)
claude-evolution config set llm.model claude-3-5-haiku-20241022
```

**调整学习阶段**:

```bash
# 延长观察期
claude-evolution config set learningPhases.observation.durationDays 7

# 提高自动应用阈值
claude-evolution config set learningPhases.automatic.confidenceThreshold 0.9
```

**查看当前配置**:

```bash
claude-evolution config list
```

### 5.4 导入已有配置

**场景**: 迁移或恢复配置

```bash
# 备份现有 CLAUDE.md 到 source 目录
cp ~/.claude/CLAUDE.md ~/.claude-evolution/source/

# 运行初始化
claude-evolution init

# 系统会自动检测并导入
```

---

## 6. 故障排查

### 6.1 常见问题

#### 问题 1: API Key 未配置

**症状**:

```
❌ 分析失败: Missing API key
```

**解决方案**:

```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY

# 如果为空,设置环境变量
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# 或写入配置文件
claude-evolution config set llm.apiKey sk-ant-api03-xxxxx
```

---

#### 问题 2: Web UI 无法访问

**症状**: 浏览器显示 "无法访问此网站"

**检查步骤**:

```bash
# 1. 检查服务是否运行
curl http://localhost:10010/api/health

# 2. 检查端口是否被占用
lsof -i :10010

# 3. 查看服务日志
pm2 logs claude-evolution  # (如果使用 PM2)
# 或
tail -f ~/.claude-evolution/logs/evolution.log
```

**解决方案**:

```bash
# 方案 1: 修改端口
export PORT=10011
node dist/web/server/index.js

# 方案 2: 杀死占用端口的进程
kill -9 $(lsof -t -i:10010)
```

---

#### 问题 3: 建议列表为空

**症状**: `claude-evolution review` 显示 "暂无待审批建议"

**检查步骤**:

```bash
# 1. 检查是否已运行分析
claude-evolution status

# 2. 手动触发分析
claude-evolution analyze --now

# 3. 检查建议文件
cat ~/.claude-evolution/suggestions/pending.json
```

**可能原因**:

- ✅ 未运行过分析
- ✅ 会话数据太少
- ✅ 上次分析时间太久

---

#### 问题 4: 命令未找到

**症状**:

```bash
claude-evolution: command not found
```

**解决方案**:

```bash
# 检查全局安装
npm list -g claude-evolution

# 重新链接
cd /path/to/claude-evolution
npm run build
npm link

# 或使用完整路径
./dist/cli/index.js status
```

---

#### 问题 5: TypeScript 编译错误

**症状**: `npm run build` 失败

**解决方案**:

```bash
# 清理构建产物
rm -rf dist/

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新编译
npm run build
```

---

#### 问题 6: WebSocket 连接失败

**症状**: Web UI 显示 "WebSocket 连接断开"

**检查步骤**:

```bash
# 测试 WebSocket
npm install -g wscat
wscat -c ws://localhost:10010

# 应显示: connected
```

**解决方案**:

- 检查防火墙设置
- 检查反向代理配置 (Nginx)
- 确保服务器运行正常

---

### 6.2 调试模式

**启用详细日志**:

```bash
# 设置环境变量
export DEBUG=claude-evolution:*

# 运行命令
claude-evolution analyze --now
```

**查看 HTTP 请求**:

```bash
export DEBUG=axios

# 运行分析
claude-evolution analyze --now
```

---

## 7. 日志管理

### 7.1 日志文件位置

| 日志类型 | 路径 | 说明 |
|---------|------|------|
| **系统日志** | `~/.claude-evolution/logs/evolution.log` | 主日志文件 |
| **PM2 日志** | `./logs/pm2-out.log` | PM2 标准输出 |
| **PM2 错误** | `./logs/pm2-error.log` | PM2 错误日志 |

### 7.2 查看日志

```bash
# 查看系统日志
tail -f ~/.claude-evolution/logs/evolution.log

# 只看错误
grep "ERROR" ~/.claude-evolution/logs/evolution.log

# 只看今天的日志
grep "$(date +%Y-%m-%d)" ~/.claude-evolution/logs/evolution.log

# 查看最近 100 行
tail -n 100 ~/.claude-evolution/logs/evolution.log
```

### 7.3 日志轮转

**使用 logrotate** (Linux):

```bash
# 创建配置文件
sudo cat > /etc/logrotate.d/claude-evolution <<EOF
/home/user/.claude-evolution/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 user user
}
EOF

# 测试
sudo logrotate -d /etc/logrotate.d/claude-evolution

# 强制轮转
sudo logrotate -f /etc/logrotate.d/claude-evolution
```

**手动清理**:

```bash
# 压缩旧日志
gzip ~/.claude-evolution/logs/evolution.log.old

# 删除 30 天前的日志
find ~/.claude-evolution/logs/ -name "*.log.gz" -mtime +30 -delete
```

---

## 8. 备份与恢复

### 8.1 备份策略

**备份频率**:

- **配置文件**: 每次修改后
- **学习成果**: 每天
- **建议数据**: 每周

**备份内容**:

```
~/.claude-evolution/
├── config.json          # 必须备份
├── state.json           # 可选
├── source/              # 必须备份
├── learned/             # 必须备份
└── suggestions/         # 可选
```

### 8.2 手动备份

```bash
# 创建备份目录
mkdir -p ~/backups/claude-evolution

# 备份配置和学习成果
tar -czf ~/backups/claude-evolution/backup-$(date +%Y%m%d).tar.gz \
  -C ~/.claude-evolution \
  config.json source/ learned/

# 验证备份
tar -tzf ~/backups/claude-evolution/backup-$(date +%Y%m%d).tar.gz
```

### 8.3 自动备份 (cron)

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * tar -czf ~/backups/claude-evolution/backup-$(date +\%Y\%m\%d).tar.gz -C ~/.claude-evolution config.json source/ learned/

# 每周日清理 30 天前的备份
0 3 * * 0 find ~/backups/claude-evolution/ -name "*.tar.gz" -mtime +30 -delete
```

### 8.4 恢复数据

```bash
# 停止服务 (如果在运行)
pm2 stop claude-evolution

# 恢复备份
tar -xzf ~/backups/claude-evolution/backup-20260313.tar.gz \
  -C ~/.claude-evolution

# 验证恢复
ls -la ~/.claude-evolution/

# 重启服务
pm2 restart claude-evolution
```

### 8.5 迁移到新机器

```bash
# 在旧机器上
tar -czf ~/claude-evolution-full.tar.gz ~/.claude-evolution

# 传输到新机器
scp ~/claude-evolution-full.tar.gz user@newmachine:~

# 在新机器上
tar -xzf ~/claude-evolution-full.tar.gz -C ~/

# 安装 CLI 工具
cd /path/to/claude-evolution
npm run build
npm link

# 验证
claude-evolution status
```

---

## 9. 性能调优

### 9.1 LLM API 优化

**减少 API 调用成本**:

```bash
# 使用 Haiku 替代 Sonnet
claude-evolution config set llm.model claude-3-5-haiku-20241022

# 降低温度 (更确定的输出,减少重试)
claude-evolution config set llm.temperature 0.2

# 减少最大 Token
claude-evolution config set llm.maxTokens 3000
```

**批量处理**:

编辑 `src/analyzers/experience-extractor.ts`:

```typescript
const BATCH_SIZE = 20;  // 增加批次大小 (默认 10)
```

### 9.2 文件 I/O 优化

**减少文件读写**:

```bash
# 降低分析频率
claude-evolution config set scheduler.interval 3h  # 从 1h 改为 3h
```

**清理旧数据**:

```bash
# 删除已拒绝的建议 (节省磁盘空间)
rm ~/.claude-evolution/suggestions/rejected.json

# 压缩旧日志
gzip ~/.claude-evolution/logs/*.log.old
```

### 9.3 Web UI 优化

**启用 Gzip 压缩** (Nginx):

```nginx
gzip on;
gzip_types text/css application/javascript application/json;
gzip_min_length 1000;
```

**启用浏览器缓存**:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 9.4 内存优化

**PM2 内存限制**:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    max_memory_restart: '500M'  // 超过 500MB 自动重启
  }]
};
```

---

## 10. 安全加固

### 10.1 环境变量保护

```bash
# 确保 .env 不被提交
echo ".env" >> .gitignore

# 设置文件权限
chmod 600 .env
chmod 600 ~/.claude-evolution/config.json
```

### 10.2 HTTPS 启用

**使用 Let's Encrypt** (免费 SSL 证书):

```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d evolution.example.com

# 自动续期
sudo certbot renew --dry-run
```

### 10.3 防火墙配置

```bash
# 只允许本地访问
sudo ufw allow from 127.0.0.1 to any port 10010

# 或允许特定 IP
sudo ufw allow from 192.168.1.100 to any port 10010
```

### 10.4 定期更新

```bash
# 更新依赖
npm update

# 检查安全漏洞
npm audit

# 自动修复
npm audit fix
```

---

## 11. 总结

### 部署检查清单

**初次部署**:

- [ ] 安装 Node.js 18+
- [ ] 克隆仓库
- [ ] 安装依赖
- [ ] 配置环境变量 (ANTHROPIC_API_KEY)
- [ ] 编译项目 (`npm run build`)
- [ ] 安装 CLI 工具 (`npm link`)
- [ ] 初始化配置 (`claude-evolution init`)
- [ ] 运行测试 (`npm test`)
- [ ] 启动 Web Server
- [ ] 验证访问

**生产环境**:

- [ ] 使用 PM2 管理进程
- [ ] 配置 Nginx 反向代理
- [ ] 启用 HTTPS
- [ ] 配置日志轮转
- [ ] 设置自动备份
- [ ] 配置防火墙
- [ ] 性能调优
- [ ] 安全加固

**日常维护**:

- [ ] 每天查看日志
- [ ] 每周检查备份
- [ ] 每月更新依赖
- [ ] 每季度安全审计

---

**维护者**: Claude Code
**最后更新**: 2026-03-13
**版本**: 0.1.0
