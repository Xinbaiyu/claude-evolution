# MCP → HTTP API 迁移说明

**日期**: 2026-03-11
**版本**: v0.1.0

---

## 迁移总结

claude-evolution 已从 **MCP 协议** 迁移到 **HTTP API** 架构,以与 claude-mem 的实际实现保持一致。

### 核心变化

| 维度 | 之前 (MCP) | 现在 (HTTP API) |
|------|------------|----------------|
| **通信协议** | MCP stdio 协议 | HTTP REST API |
| **服务端口** | N/A (stdio) | `http://localhost:37777` |
| **数据获取** | 三层检索 (search/timeline/get) | 直接查询 observations |
| **依赖** | `@modelcontextprotocol/sdk` | 原生 `fetch` |
| **配置字段** | `config.mcp.*` | `config.httpApi.*` |

---

## 技术原理

### 为什么改为 HTTP API?

根据 claude-mem 的官方架构文档,系统通过 **Worker Service** (运行在 `localhost:37777`) 提供 HTTP API 访问历史会话数据,而非 MCP 协议。

```
┌──────────────────────────────────────────┐
│        Claude Code Sessions              │
└────────────────┬─────────────────────────┘
                 │
                 ↓ (Hooks)
┌──────────────────────────────────────────┐
│     claude-mem Worker Service            │
│     HTTP API: http://localhost:37777     │
├──────────────────────────────────────────┤
│  GET /api/observations                   │
│  GET /api/stats                          │
│  GET /api/search                         │
└────────────────┬─────────────────────────┘
                 │
                 ↓
┌──────────────────────────────────────────┐
│  Storage: SQLite + Chroma Vector DB      │
└──────────────────────────────────────────┘
```

### HTTP API 优势

1. **简单直接**: 无需维护 MCP 连接状态
2. **标准协议**: 使用标准 HTTP REST API
3. **易于调试**: 可直接用 `curl` 测试
4. **更高效**: 避免三层检索的开销,直接获取数据

---

## 代码变更

### 1. 移除的模块

- `src/memory/mcp-client.ts` (已删除)
- `@modelcontextprotocol/sdk` 依赖

### 2. 新增的模块

- `src/memory/http-client.ts` - HTTP 客户端实现

### 3. 修改的文件

| 文件 | 变更内容 |
|------|---------|
| `package.json` | 移除 MCP SDK 依赖 |
| `src/config/schema.ts` | `mcp` → `httpApi` 配置 |
| `src/memory/index.ts` | 导出 `http-client` 而非 `mcp-client` |
| `src/analyzers/pipeline.ts` | 使用 `createHTTPClient()` |
| `src/analyzers/session-collector.ts` | 调用 HTTP API 方法 |
| `src/cli/commands/config.ts` | 显示 HTTP API 配置 |
| `src/analyzers/experience-extractor.ts` | 移除 `config.mcp.batchSize` |

---

## 配置变更

### 旧配置 (MCP)

```json
{
  "mcp": {
    "dataDir": "~/.claude-mem",
    "maxRetries": 3,
    "retryDelay": 1000,
    "batchSize": 10
  }
}
```

### 新配置 (HTTP API)

```json
{
  "httpApi": {
    "baseUrl": "http://localhost:37777",
    "maxRetries": 3,
    "retryDelay": 1000,
    "timeout": 30000
  }
}
```

### 自动迁移

运行 `claude-evolution init` 会自动生成新配置格式。

---

## API 对比

### 之前 (MCP 三层检索)

```typescript
// 1. Search (轻量级索引)
const results = await mcpClient.search({
  dateStart: '2026-03-01',
  limit: 100
});

// 2. 过滤高质量ID
const ids = results
  .filter(r => r.score > 0.5)
  .map(r => r.id);

// 3. 批量获取完整内容
const observations = await mcpClient.getObservations(ids);
```

### 现在 (HTTP 直接查询)

```typescript
// 直接获取完整 observations
const observations = await httpClient.getObservations({
  created_at_start: Math.floor(new Date('2026-03-01').getTime() / 1000),
  limit: 200
});

// 客户端过滤类型
const filtered = observations.filter(obs =>
  ['feature', 'bugfix', 'refactor'].includes(obs.type)
);
```

---

## 测试验证

### 1. 验证 Worker Service 可用

```bash
# 检查服务状态
curl http://localhost:37777/api/stats

# 预期输出:
# {
#   "total_observations": 150,
#   "total_projects": 5,
#   "by_type": { "feature": 80, "bugfix": 45, ... }
# }
```

### 2. 测试查询 observations

```bash
# 获取最近 10 条记录
curl 'http://localhost:37777/api/observations?limit=10'
```

### 3. 运行完整流程

```bash
# 重新编译
npm run build

# 初始化配置
node dist/cli/index.js init

# 运行分析
node dist/cli/index.js analyze --now
```

---

## 性能影响

### 预期改进

| 指标 | 之前 (MCP) | 现在 (HTTP) | 改进 |
|------|-----------|------------|------|
| **请求数** | 3 次 (search/timeline/get) | 1 次 | ↓ 67% |
| **网络延迟** | ~200ms × 3 | ~200ms × 1 | ↓ 400ms |
| **数据传输** | 索引 + 内容 | 仅内容 | ↓ ~30% |

### 实测基准 (预估)

- **采集 100 条会话**: ~1-2 秒 (之前 ~3-4 秒)
- **首次分析**: ~30 秒 (之前 ~45 秒)

---

## 故障排查

### 问题 1: HTTP 连接失败

```bash
# 症状
❌ 连接 claude-mem HTTP 服务失败

# 检查
curl http://localhost:37777/api/stats

# 解决
# 1. 确认 claude-mem Worker Service 已运行
# 2. 检查端口 37777 是否被占用
# 3. 查看 claude-mem 日志
```

### 问题 2: 返回空数据

```bash
# 症状
查询成功但返回 []

# 可能原因
# 1. 时间范围太窄
# 2. 没有匹配的类型
# 3. 数据库为空

# 解决
# 查看数据库统计
curl http://localhost:37777/api/stats

# 放宽查询条件
# 在 Claude Code 中生成新的会话数据
```

---

## 回滚方案

如果需要回滚到 MCP 版本:

```bash
# 1. 切换到 MCP 分支 (如果存在)
git checkout mcp-version

# 2. 恢复依赖
npm install

# 3. 重新编译
npm run build

# 4. 更新配置
# 手动编辑 ~/.claude-evolution/config.json
# 恢复 mcp 字段
```

---

## 下一步

- [ ] 监控生产环境性能
- [ ] 收集用户反馈
- [ ] 优化 HTTP 查询参数
- [ ] 添加缓存层 (如需要)
- [ ] 编写 HTTP API 集成测试

---

## 参考资料

- **claude-mem 架构文档**: `~/Desktop/claude-mem-architecture-guide.md`
- **HTTP API 参考**: Section 8 (line 958)
- **Worker Service 架构**: Section 4 (line 18)

---

**迁移完成日期**: 2026-03-11
**负责人**: Claude Code
**验证状态**: ✅ 编译通过,待实际运行测试
