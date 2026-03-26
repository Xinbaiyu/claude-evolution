## Why

当前 UI 中的 "OpenAI" 选项过于具体，误导用户以为只能使用 OpenAI 官方 API。实际上该选项应该支持所有兼容 OpenAI API 格式的服务，包括 Azure OpenAI、MatrixLLM、OneAPI、FastGPT、LocalAI 等第三方或本地服务。

## What Changes

- 重命名 "OpenAI" 为 "OpenAI-Compatible API"，准确传达该选项的通用性
- 添加 baseURL 配置项（可选，默认 `https://api.openai.com`），让用户可以指定自定义 API 端点
- 添加 API Key 输入框，支持在 UI 直接配置密钥（不强制使用环境变量 `OPENAI_API_KEY`）
- 更新信息提示框文案，说明该模式支持所有 OpenAI-compatible API 服务
- 后端 OpenAI Provider 支持从配置读取 apiKey（优先级：config.apiKey > 环境变量）

## Capabilities

### New Capabilities
- `openai-compatible-config`: OpenAI-Compatible API 配置能力，包括 baseURL 和 API Key 字段

### Modified Capabilities
<!-- 无现有能力被修改，这是现有功能的增强 -->

## Impact

- `web/client/src/components/LLMProviderConfig.tsx` - 更新 UI 组件，重命名标签、添加输入框
- `src/config/schema.ts` - 扩展 LLM config schema，添加 `openai.apiKey` 字段
- `src/llm/providers/openai.ts` - 更新 Provider，支持从 config 读取 apiKey 和 baseURL
- `web/client/src/api/client.ts` - 更新前端类型定义（如需要）
