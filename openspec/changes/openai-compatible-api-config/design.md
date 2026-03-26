## Context

当前系统支持三种 LLM provider 模式：Claude（官方 API）、OpenAI、CCR（代理）。OpenAI 模式当前只从环境变量 `OPENAI_API_KEY` 读取密钥，且 UI 标签 "OpenAI" 误导用户以为只能用 OpenAI 官方服务。

实际上，该模式应该支持所有兼容 OpenAI API 格式的服务（Azure OpenAI、MatrixLLM、本地 Ollama 等）。用户需要：
1. 在 UI 清楚知道这是通用的 OpenAI-compatible API 模式
2. 能配置自定义 baseURL（不限于 OpenAI 官方）
3. 能在 UI 直接输入 API Key（不强制环境变量）

**约束条件：**
- 必须保持向后兼容，现有配置不能失效
- 环境变量 `OPENAI_API_KEY` 仍然作为回退选项

**利益相关者：**
- 使用 Azure OpenAI 或其他兼容服务的用户
- 需要在 UI 管理多个 API Key 的用户

## Goals / Non-Goals

**Goals:**
- 重命名 UI 标签为 "OpenAI-Compatible API" 或类似通用名称
- 添加 baseURL 配置项（UI 输入框 + schema 字段）
- 添加 API Key 配置项（UI 输入框 + schema 字段），优先级高于环境变量
- 更新 Provider 实现，支持从 config 读取 apiKey 和 baseURL
- 保持向后兼容，环境变量仍然作为回退选项

**Non-Goals:**
- 不改变 OpenAI Provider 的核心 API 调用逻辑
- 不添加多 API Key 轮询或负载均衡功能
- 不改变其他两种模式（Claude、CCR）的配置方式

## Decisions

### 1. UI 标签重命名为 "OpenAI-Compatible API"

**决策：** 将 `PROVIDER_META.openai.title` 从 "OpenAI" 改为 "OpenAI-Compatible API"，`subtitle` 改为 "Compatible API"。

**理由：**
- 准确传达该选项的通用性，避免误导
- 与 CCR 模式区分开（CCR 是 Claude 代理，OpenAI-compatible 是 OpenAI 格式 API）
- 用户看到名称就能理解可以用 Azure、本地服务等

**备选方案：**
- "通用 API" - 太模糊，不明确是什么格式
- "OpenAI / Compatible" - 名称太长，且 "/" 符号在 UI 上不美观

### 2. Config schema 扩展

**决策：** 在 `config.llm.openai` 下添加 `apiKey` 字段（string | null），`baseURL` 字段已存在于 `config.llm` 层级，无需改动。

**Schema 结构：**
```typescript
llm: {
  provider: 'openai',
  model: string,
  baseURL?: string,  // 已存在，OpenAI 和 CCR 共用
  openai: {
    apiKey?: string,       // 新增
    organization?: string  // 已存在
  }
}
```

**理由：**
- `baseURL` 已存在于 `llm` 层级，OpenAI 和 CCR 模式都使用，保持一致性
- `apiKey` 放在 `openai` 命名空间下，与 `organization` 一致
- 字段可选，保持向后兼容

### 3. API Key 优先级逻辑

**决策：** OpenAI Provider 按以下优先级读取 API Key：
1. `config.llm.openai.apiKey`（UI 输入）
2. `OPENAI_API_KEY` 环境变量（回退）
3. 抛出错误（两者都没有时）

**实现：**
```typescript
const apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OpenAI API Key not configured. Set it in UI or OPENAI_API_KEY env var.');
}
```

**理由：**
- Config 优先级更高，符合用户预期（UI 配置应该覆盖默认环境变量）
- 保持向后兼容，环境变量仍然有效
- 明确的错误提示，告知用户如何配置

### 4. BaseURL 默认值处理

**决策：** UI 输入框显示 placeholder `https://api.openai.com`，但 config 中 `baseURL` 为空时，OpenAI SDK 自动使用默认值。

**理由：**
- 避免在 config 中存储冗余的默认值
- OpenAI SDK 本身已有默认 baseURL，无需手动设置
- 用户留空时行为与之前一致（使用官方 API）

## Risks / Trade-offs

### Risk 1: API Key 明文存储在 config.json

**Trade-off:** Config 文件以明文存储 API Key，存在泄露风险。

**缓解措施：**
- 在 UI 输入框旁边添加警告文本："API Key 将以明文存储在配置文件中，请勿提交到版本控制系统"
- 推荐用户使用环境变量（更安全）或将 config.json 加入 .gitignore
- 未来可考虑加密存储（不在本次范围内）

### Risk 2: UI 标签变更可能让现有用户困惑

**Trade-off:** 用户习惯了 "OpenAI" 标签，改名后可能短暂困惑。

**缓解措施：**
- 在信息提示框中明确说明："支持 OpenAI、Azure OpenAI、本地 Ollama 等所有 OpenAI-compatible API"
- 保留 "OpenAI" 在描述文本中，让用户知道这包括 OpenAI 官方

### Risk 3: BaseURL 配置错误导致 API 调用失败

**Trade-off:** 用户可能输入错误的 baseURL（如忘记 `https://`），导致 API 调用失败。

**缓解措施：**
- 输入框 placeholder 显示完整格式示例 `https://api.openai.com`
- 在 helper text 中提示："请输入完整 URL，如 https://api.azure.com"
- Provider 错误信息包含当前使用的 baseURL，方便调试

## Open Questions

None - 设计已明确，可直接实施。
