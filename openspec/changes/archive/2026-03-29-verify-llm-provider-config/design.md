## Context

LLM Provider 配置功能刚完成重构，支持三种模式：
1. Claude Official API - 使用 Anthropic SDK
2. OpenAI-Compatible API - 支持 OpenAI、Azure OpenAI、MatrixLLM、Ollama 等
3. CCR Proxy - 本地代理模式

Model 字段已从下拉框改为自由输入（AutoComplete + localStorage 历史记录），provider 切换时保留用户输入的 model 值。

需要全面验证这些功能确保正确性，避免配置错误导致运行时故障。

## Goals / Non-Goals

**Goals:**
- 验证三种 provider 模式的 UI 交互正确性
- 验证配置数据的持久化和加载
- 验证 provider 切换逻辑（特别是 model 值保留）
- 验证运行时 LLM 调用功能
- 验证 Model 字段的自由输入和历史记录功能
- 发现并记录潜在问题

**Non-Goals:**
- 不编写自动化单元测试（本次只做手动验证）
- 不修复发现的问题（验证完成后单独处理）
- 不测试 LLM 调用的性能或质量

## Decisions

### 验证方式：手动测试 + 浏览器自动化

**选择原因：**
- 手动测试可以直观验证 UI 交互体验
- 使用 agent-browser 进行浏览器自动化，可以验证 DOM 结构、事件处理和状态更新
- 结合真实 LLM 调用验证端到端功能

**替代方案（未采用）：**
- 纯自动化测试：投入成本高，且 UI 组件测试容易因样式改动失效
- 纯手动测试：可重复性差，容易遗漏边界情况

### 测试端点：使用 MatrixLLM 作为 OpenAI-Compatible API 测试目标

**选择原因：**
- MatrixLLM (`https://matrixllm.alipay.com/v1/chat/completions`) 是内部可用的 OpenAI 兼容端点
- 避免使用外部 OpenAI API 产生费用
- 可以在验证过程中同时测试国产模型兼容性

**配置：**
- Base URL: `https://matrixllm.alipay.com/v1`
- Model: `qwen-turbo` 或其他可用模型
- API Key: 由用户提供（验证时通知用户）

**替代方案（未采用）：**
- 使用真实 OpenAI API：会产生费用
- 使用 mock 服务：无法验证真实调用行为

### 验证范围：覆盖所有三种 provider 模式

**验证场景：**

1. **Claude Official API 模式**
   - 配置项：Model 下拉选择、Temperature、Max Tokens、Prompt Caching
   - 验证点：配置保存、Environment variable (ANTHROPIC_API_KEY) 检测

2. **OpenAI-Compatible API 模式**
   - 配置项：Model 自由输入、Base URL、API Key、Organization、Temperature、Max Tokens
   - 验证点：自由输入、历史记录、配置保存、运行时调用（使用 MatrixLLM）

3. **CCR Proxy 模式**
   - 配置项：Proxy Endpoint、Model、Temperature、Max Tokens
   - 验证点：baseURL 配置、provider 检测逻辑

### 验证流程：分层验证

**Layer 1: UI 交互验证（浏览器自动化）**
- Provider 卡片选择和视觉状态
- 配置表单字段渲染
- Model 字段自由输入和历史记录下拉
- Provider 切换时 model 值保留

**Layer 2: 数据持久化验证**
- 保存配置到 `~/.claude-evolution/config/config.json`
- 刷新页面后配置正确加载
- Model 历史记录存储到 localStorage

**Layer 3: 运行时验证**
- 使用 MatrixLLM 测试 OpenAI-Compatible 模式的真实调用
- 验证 LLM 客户端工厂正确创建 provider 实例
- 验证错误处理（无效 API Key、网络错误等）

## Risks / Trade-offs

### Risk 1: 需要真实 API Keys
- **影响**: OpenAI-Compatible 模式的运行时验证需要 MatrixLLM API Key
- **缓解**: 由用户提供 API Key，验证前明确告知

### Risk 2: 配置文件可能损坏
- **影响**: 验证过程中修改配置文件，可能导致现有配置丢失
- **缓解**: 验证前备份 `~/.claude-evolution/config/config.json`，完成后恢复

### Risk 3: Daemon 重启可能影响运行中的任务
- **影响**: 验证配置需要重启 daemon，可能中断正在运行的学习任务或定时器
- **缓解**: 在空闲时段执行验证，或提前暂停相关任务

### Risk 4: 浏览器缓存可能导致误判
- **影响**: 浏览器缓存旧的 JavaScript 文件，UI 更新未生效
- **缓解**: 使用 cache-busting URL 参数，清空浏览器缓存

## Trade-offs

- **手动测试 vs 自动化测试**: 选择手动+浏览器自动化，牺牲长期可维护性换取短期验证速度
- **覆盖率 vs 成本**: 重点验证核心场景（配置、切换、调用），不追求 100% 分支覆盖
- **真实调用 vs Mock**: 使用真实 MatrixLLM 端点，牺牲隔离性换取真实性
