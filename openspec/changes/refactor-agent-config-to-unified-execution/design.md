## Context

当前系统有两个独立的 LLM 配置点：
1. **`config.llm`**（claude/openai/ccr）- 用于系统内部的分析 pipeline、学习系统
2. **`config.bot.cc`** - 用于钉钉机器人通过 spawn `claude` CLI 执行任务

问题在于 `bot.cc` 埋在机器人配置中，当需要添加新的 Agent 执行场景（如定时调研任务）时，无法复用这套配置。此次重构将 Agent 执行配置提升为顶级配置，供所有场景使用。

**当前配置读取路径**：
- 钉钉机器人 → `config.bot.cc`
- 系统分析 → `config.llm`

**技术栈**：
- Backend: TypeScript + Zod schema
- Frontend: React + Ant Design
- 配置存储：JSON 文件 `~/.claude-evolution/config.json`

## Goals / Non-Goals

**Goals:**
- 将 Agent 执行配置从 `bot.cc` 提升为顶级 `config.agent`
- 简化配置：通过 `baseURL` 字段区分原生 Claude 和 CCR，其他配置通用
- 提供配置迁移逻辑，自动将旧配置转换为新结构
- WebUI 新增独立的 "Agent 执行" Tab
- 所有 Agent 执行场景（钉钉、定时调研）统一读取 `config.agent`

**Non-Goals:**
- 不改变 `config.llm` 的结构（系统内部分析仍使用独立配置）
- 不修改 `executeCC()` 函数签名（仍接受相同参数）
- 不实现定时调研任务功能本身（仅提供配置基础）

## Decisions

### 决策 1：配置结构设计

**选择**：扁平化结构，通过 `baseURL` 区分模式

```typescript
agent: {
  baseURL: string | null,      // null = 原生 Claude, 有值 = CCR
  defaultCwd: string,
  allowedDirs: string[],
  timeoutMs: number,
  maxBudgetUsd: number,
  permissionMode: string,
}
```

**理由**：
- 原生 Claude 和 CCR 只有 `baseURL` 不同，其他配置完全一致
- 扁平结构比嵌套结构（`claudeCLI: {...}, apiDirect: {...}`）更简洁
- 符合现有 `cc-executor.ts` 的实现逻辑（第 62-65 行已支持 baseURL）

**备选方案（已否决）**：
```typescript
agent: {
  executor: "claude-cli" | "api-direct",
  claudeCLI: { baseURL, ... },
  apiDirect: { provider, ... }
}
```
- 否决理由：过度设计，当前不需要 `api-direct` 模式

---

### 决策 2：配置迁移策略

**选择**：Loader 层自动迁移 + 废弃警告

```typescript
// config/loader.ts
if (rawConfig.bot?.cc && !rawConfig.agent) {
  logger.warn('bot.cc is deprecated, migrating to agent config');
  rawConfig.agent = {
    baseURL: rawConfig.bot.cc.baseURL,
    defaultCwd: rawConfig.bot.cc.defaultCwd,
    allowedDirs: rawConfig.bot.cc.allowedDirs,
    timeoutMs: rawConfig.bot.cc.timeoutMs,
    maxBudgetUsd: rawConfig.bot.cc.maxBudgetUsd,
    permissionMode: rawConfig.bot.cc.permissionMode,
  };
  delete rawConfig.bot.cc;  // 迁移后删除旧配置
  await saveConfig(rawConfig);  // 持久化
}
```

**理由**：
- 用户无感知升级
- 首次启动时自动迁移并保存
- 避免双重配置源导致混淆

**备选方案（已否决）**：
1. 保留 `bot.cc` 作为 fallback（读取时优先 `agent`，没有则读 `bot.cc`）
   - 否决理由：维护两套路径增加复杂度
2. 手动迁移脚本
   - 否决理由：用户体验差

---

### 决策 3：WebUI Tab 结构

**选择**：新增独立 Tab "Agent 执行"

**布局**：
```
Settings 页面
├─ 调度器
├─ LLM 提供商 (改名，原"Claude 模型")
├─ Agent 执行 (新增)
├─ 增量学习
└─ 通知通道 (移除"Claude Code 桥接"区块)
```

**Agent 执行 Tab UI**：
```
┌─ 执行模式 ──────────────────┐
│ ○ 原生 Claude  ○ CCR 代理   │  ← 单选框
│                              │
│ [API 代理地址]  ← 选 CCR 显示│
│ http://localhost:3456        │
└──────────────────────────────┘

┌─ 执行配置（通用）───────────┐
│ 工作目录、白名单、超时...    │
└──────────────────────────────┘
```

**理由**：
- 独立 Tab 清晰表达"这是 Agent 执行的统一配置"
- "LLM 提供商"改名准确描述系统内部分析的模型选择
- 从"通知通道"移除 CC 配置，职责更清晰

---

### 决策 4：组件设计

**选择**：新建独立组件 `AgentExecutionConfig.tsx`

```typescript
interface AgentExecutionConfigProps {
  config: Config;
  onSave: (newConfig: Config) => void;
}
```

**理由**：
- 复用 LLMProviderConfig 的设计模式
- 组件职责单一，易于测试
- Ant Design 组件库保持一致

**不新建组件，直接在 Settings.tsx 写**：
- 否决理由：Settings.tsx 已超过 800 行，需要拆分

## Risks / Trade-offs

### 风险 1：配置迁移失败

**风险**：旧配置读取失败或迁移逻辑有 bug

**缓解措施**：
- 迁移前备份配置文件（`config.json.backup`）
- 迁移失败时回滚并提示用户
- 单元测试覆盖迁移逻辑

---

### 风险 2：破坏现有钉钉机器人功能

**风险**：重构配置读取路径后，钉钉功能失效

**缓解措施**：
- 先实现迁移逻辑，确保旧配置能正常工作
- 集成测试验证钉钉机器人功能
- 灰度发布，先在测试环境验证

---

### 风险 3：用户已有 `config.agent` 配置

**风险**：如果用户手动添加了 `agent` 配置，迁移逻辑会跳过

**缓解措施**：
```typescript
if (rawConfig.bot?.cc) {
  if (rawConfig.agent) {
    logger.warn('Both bot.cc and agent exist, using agent config');
  } else {
    // 迁移逻辑
  }
}
```

---

### Trade-off：配置字段命名

**选择**：保持 `baseURL` 而非 `proxyURL` 或 `endpoint`

**理由**：
- 与 `cc-executor.ts` 现有实现一致（第 44 行已有 `baseURL` 参数）
- Anthropic SDK 使用 `baseURL` 作为环境变量名

**代价**：
- 不够语义化（`baseURL` 可能让人误解为"应用的 base URL"）

---

## Migration Plan

### 阶段 1：Backend 配置层（无影响）

1. 新增 `agent` schema 到 `config/schema.ts`
2. 实现配置迁移逻辑到 `config/loader.ts`
3. 单元测试验证迁移

**验证**：运行测试，确保 `loadConfig()` 能正确迁移

---

### 阶段 2：调用层切换（可能影响钉钉）

1. 修改 `bot/commands/cc-bridge.ts` 读取 `config.agent`
2. 添加 fallback 逻辑（优先 `agent`，没有则 `bot.cc`）

**验证**：手动测试钉钉机器人功能

---

### 阶段 3：WebUI 层（用户可见）

1. 新建 `components/AgentExecutionConfig.tsx`
2. 修改 `Settings.tsx`：新增 Tab、移除旧区块
3. 更新 API 路由

**验证**：浏览器测试配置保存和加载

---

### 阶段 4：清理（3 个版本后）

1. 删除 `bot.cc` schema
2. 删除迁移逻辑
3. 更新文档

---

### Rollback 策略

如果发现严重问题：

1. **Backend**：恢复 `config/loader.ts` 的旧版本
2. **Frontend**：隐藏 "Agent 执行" Tab，恢复"Claude Code 桥接"区块
3. **数据**：用户配置文件有 `.backup` 可手动恢复

---

## Open Questions

1. **是否需要在 WebUI 显示迁移提示？**
   - 建议：首次加载时，如果检测到迁移，Toast 提示"配置已自动升级"

2. **`bot.cc` 废弃警告保留多久？**
   - 建议：3 个小版本（如 0.2.0 → 0.2.1 → 0.2.2 → 0.3.0 删除）

3. **是否需要在 CLI 也支持配置迁移？**
   - 当前：仅 daemon 启动时迁移
   - 建议：CLI `init` 命令也支持迁移检测
