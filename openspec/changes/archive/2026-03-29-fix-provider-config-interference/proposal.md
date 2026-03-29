## Why (为什么需要这个改动)

LLM Provider 配置页面存在严重的配置互相干扰问题。三个提供商（Claude、OpenAI、CCR）共享同一个 `config.llm` 对象的字段（`model`、`temperature`、`maxTokens`、`baseURL` 等），导致在 CCR 中选择模型会覆盖 Claude 和 OpenAI 的模型选择。用户无法为不同提供商维护独立的配置，每次切换提供商都要重新配置所有参数。

**核心问题**：
- 所有三个提供商共用同一套配置字段
- 切换提供商时，`handleModeChange` 函数会修改共享字段，导致其他提供商的配置丢失
- 用户在 CCR 选择 `claude-sonnet-4-6`，切换到 OpenAI 后，OpenAI 的 model 也变成了 `claude-sonnet-4-6`
- 这是设计缺陷，不是用户操作问题

## What Changes (将要改变什么)

- **BREAKING**: 重构后端 `LLMSchema`，将共享的扁平字段改为提供商独立的嵌套配置
- 添加 `activeProvider` 字段，显式标记当前使用的提供商
- 更新前端 `LLMProviderConfig` 组件，为每个提供商维护独立状态
- 实现配置迁移逻辑，将现有扁平配置自动转换为嵌套结构
- 更新所有 LLM 客户端工厂逻辑，从新的嵌套结构读取配置

### 详细改动：

1. **后端 Schema (`src/config/schema.ts`)**：
   - 添加 `activeProvider: 'claude' | 'openai' | 'ccr'` 字段
   - 用提供商独立的嵌套对象替换共享扁平字段：
     - `claude: { model, temperature, maxTokens, enablePromptCaching, apiVersion }`
     - `openai: { model, temperature, maxTokens, baseURL, apiKey, organization }`
     - `ccr: { model, temperature, maxTokens, baseURL }`
   - 移除顶层的 `provider`、`model`、`temperature`、`maxTokens`、`baseURL`、`anthropic`、`openai` 字段

2. **前端组件 (`web/client/src/components/LLMProviderConfig.tsx`)**：
   - 为每个提供商维护独立的状态对象
   - 用户切换提供商时，保存当前提供商的状态，加载目标提供商的已保存状态
   - 用户更改设置时，只修改当前激活提供商的配置
   - 移除会覆盖共享字段的 `handleModeChange` 逻辑

3. **配置迁移 (`src/config/loader.ts`)**：
   - 检测旧配置格式（顶层有 `model`、`provider` 等扁平字段）
   - 转换为新格式：
     - 根据 `provider` 和 `baseURL` 字段推断 `activeProvider`
     - 将现有值填充到激活提供商的嵌套对象
     - 为未激活的提供商设置默认值
   - 迁移前备份旧配置

4. **LLM 客户端工厂 (`src/llm/client-factory.ts`)**：
   - 更新 `createLLMClient`，从 `config.llm.activeProvider` 读取当前提供商
   - 从嵌套对象读取提供商配置（`config.llm.claude`、`config.llm.openai`、`config.llm.ccr`）

5. **模型自动发现功能（新增，可选）**：
   - 当用户在 OpenAI 或 CCR 模式下提供 `baseURL` 时，前端可调用 `GET {baseURL}/v1/models` 接口
   - 自动获取该服务支持的模型列表（OpenAI Compatible API 标准接口）
   - 在 Model 字段显示获取到的模型供用户选择，同时保留手动输入功能
   - 支持 OpenAI、DeepSeek、Qianwen、Ollama 等所有兼容 OpenAI API 的服务
   - 如果接口调用失败（服务不支持或网络问题），回退到手动输入模式
   - 添加"刷新模型列表"按钮，允许用户重新获取

## Capabilities (功能点)

### New Capabilities (新增功能)
- `provider-config-isolation`: 每个 LLM 提供商拥有独立配置，互不干扰

### Modified Capabilities (修改的功能)
- `llm-provider-configuration`: LLM 提供商的配置 schema 和 UI 行为改变，支持独立配置

## Impact (影响范围)

### Breaking Changes (破坏性变更)
- **配置文件格式**：现有 `~/.claude-evolution/config.json` 使用扁平结构，需要迁移
- **API 契约**：直接读取 `config.llm.model` 的代码必须更新为从提供商嵌套对象读取

### 受影响的组件
- 后端：
  - `src/config/schema.ts` - LLM schema 定义
  - `src/config/loader.ts` - 配置加载和迁移
  - `src/llm/client-factory.ts` - LLM 提供商实例化
  - `src/analyzers/experience-extractor.ts` - 读取 LLM 配置
  - 所有读取 `config.llm` 字段的组件

- 前端：
  - `web/client/src/components/LLMProviderConfig.tsx` - 提供商配置 UI
  - `web/client/src/api/client.ts` - Config 类型定义

### 迁移路径
1. 更新后首次启动：Daemon 检测到旧配置格式
2. 备份当前配置到 `config.json.backup-TIMESTAMP`
3. 自动迁移到新格式
4. 记录迁移详情供用户查看
5. 迁移失败时恢复备份并退出报错
