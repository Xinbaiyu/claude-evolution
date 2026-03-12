# claude-code-router 集成指南

## 什么是 claude-code-router？

claude-code-router 是一个 API 代理/路由服务，用于：
- 转发 Anthropic API 请求
- 可能提供密钥管理、流量控制、成本优化等功能
- 使用自定义的 API Key 格式（通常较短，如 35 字符）

---

## 配置方法

### 方式 1: 使用环境变量（推荐）

```bash
# 设置 API Key（你的路由器 Key）
export ANTHROPIC_API_KEY="sk-8da9508..."

# 设置自定义 API 端点（等你提供 router 源码后确定）
export ANTHROPIC_BASE_URL="http://localhost:PORT"  # 或其他地址

# 测试连接
node test-api-key.js
```

### 方式 2: 修改配置文件

编辑 `~/.claude-evolution/config.json`:

```json
{
  "llm": {
    "model": "claude-3-5-haiku-20241022",
    "maxTokens": 4096,
    "temperature": 0.3,
    "enablePromptCaching": true,
    "baseURL": "http://localhost:PORT/v1",  // 路由器端点
    "defaultHeaders": {
      // 如果需要额外的请求头
      "X-Custom-Header": "value"
    }
  }
}
```

---

## 需要从 claude-code-router 源码确认的信息

当你下载 claude-code-router 源码后，请帮我找到以下信息：

### 1. 服务端口和路径

```javascript
// 查找类似这样的代码
app.listen(PORT)
// 或
router.post('/v1/messages', ...)
```

**需要确认**:
- 监听的端口号（如 3000, 8080）
- API 路径前缀（如 `/v1`, `/api`, 或直接 `/`）

### 2. 请求转发方式

```javascript
// 查找转发逻辑
axios.post('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': realApiKey }
})
```

**需要确认**:
- 是否需要特殊的请求头格式
- 密钥如何映射（你的 Key → 真实 Anthropic Key）
- 是否支持 Prompt Caching

### 3. 支持的模型名称

```javascript
// 查找模型名称映射
const modelMap = {
  'claude-haiku': 'claude-3-5-haiku-20241022',
  ...
}
```

**需要确认**:
- 路由器使用什么模型名称
- 是否需要修改我们的模型配置

---

## 常见代理架构

### 架构 A: 标准转发

```
claude-evolution → claude-code-router → Anthropic API
                   (localhost:PORT)     (api.anthropic.com)
```

配置:
```json
{
  "llm": {
    "baseURL": "http://localhost:PORT"
  }
}
```

### 架构 B: 路径前缀

```
claude-evolution → router/v1/messages → Anthropic /v1/messages
```

配置:
```json
{
  "llm": {
    "baseURL": "http://localhost:PORT/v1"
  }
}
```

### 架构 C: 完全自定义

```
claude-evolution → router/custom-endpoint → 自定义逻辑
```

需要查看源码确定具体配置。

---

## 调试步骤

### 1. 确认路由器运行

```bash
# 检查路由器是否启动
curl http://localhost:PORT/health  # 或其他健康检查端点

# 或查看进程
ps aux | grep claude-code-router
```

### 2. 测试简单请求

```bash
# 直接测试路由器
curl -X POST http://localhost:PORT/v1/messages \
  -H "x-api-key: sk-8da9508..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "test"}]
  }'
```

### 3. 使用 claude-evolution 测试

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="sk-8da9508..."
export ANTHROPIC_BASE_URL="http://localhost:PORT"

# 测试
node test-api-key.js
```

---

## 预期的源码结构

claude-code-router 可能是这样的结构:

```
claude-code-router/
├── server.js (或 index.js)    # 主服务器
├── config.js                   # 配置文件
├── routes/
│   └── messages.js            # API 路由
└── middleware/
    └── auth.js                # 认证中间件
```

**关键文件**:
- 查看 `server.js` 或 `index.js` 找到端口和路由设置
- 查看 `routes/` 找到 API 端点路径
- 查看 `middleware/` 或 `auth.js` 找到认证逻辑

---

## 下一步

**请从 claude-code-router 源码中找到**:

1. ✅ 服务监听的端口（如 `PORT=3000`）
2. ✅ API 端点路径（如 `/v1/messages`）
3. ✅ 请求头要求（如 `x-api-key` vs `anthropic-version`）
4. ✅ 模型名称格式（是否有映射）
5. ✅ 是否支持 Prompt Caching

找到这些信息后，我会帮你配置正确的 `baseURL` 和其他参数。

---

## 临时解决方案

在等待源码分析期间，你可以尝试：

### 方案 1: 禁用 Prompt Caching

```bash
# 修改配置
node dist/cli/index.js config set llm.enablePromptCaching false
```

某些代理可能不支持 Prompt Caching，导致 403 错误。

### 方案 2: 使用更通用的模型名

```bash
# 尝试简化的模型名
node dist/cli/index.js config set llm.model claude-3-5-haiku-20241022
```

### 方案 3: 检查路由器日志

```bash
# 查看路由器的日志输出
# 可能会显示为什么请求被拒绝
```

---

**把 claude-code-router 的源码给我后，我会帮你找到正确的配置方式！**
