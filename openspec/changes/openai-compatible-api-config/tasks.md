## 1. Config Schema 更新

- [x] 1.1 在 `src/config/schema.ts` 中的 `llm.openai` 对象添加 `apiKey` 字段（可选 string）
- [x] 1.2 更新 `web/client/src/api/client.ts` 前端类型定义，同步添加 `openai.apiKey` 字段

## 2. Backend Provider 更新

- [x] 2.1 修改 `src/llm/providers/openai.ts` 中的 `OpenAIProvider` 构造函数，接受 `config.openai?.apiKey` 参数
- [x] 2.2 实现 API Key 优先级逻辑：优先使用 `config.openai?.apiKey`，回退到 `process.env.OPENAI_API_KEY`
- [x] 2.3 更新 API Key 缺失时的错误提示信息，告知用户可在 UI 或环境变量中配置
- [x] 2.4 确认 baseURL 参数已正确传递（现有代码应该已支持，验证即可）

## 3. Frontend UI 组件更新

- [x] 3.1 在 `web/client/src/components/LLMProviderConfig.tsx` 中重命名 `PROVIDER_META.openai.title` 为 "OpenAI-Compatible API"
- [x] 3.2 重命名 `PROVIDER_META.openai.subtitle` 为 "Compatible API"
- [x] 3.3 更新 OpenAI 模式的信息提示框文案，说明支持 OpenAI、Azure OpenAI、本地服务等所有兼容 API
- [x] 3.4 在 OpenAI 配置区域添加 baseURL 输入框（antd Input 组件），placeholder 为 `https://api.openai.com`
- [x] 3.5 添加 baseURL 输入框的 helper text："自定义 API 端点（可选）。支持 Azure OpenAI、本地 Ollama 等"
- [x] 3.6 在 OpenAI 配置区域添加 API Key 输入框（antd Input.Password 组件）
- [x] 3.7 添加 API Key 输入框的 helper text："留空则使用环境变量 OPENAI_API_KEY。⚠️ API Key 将以明文存储在配置文件中"
- [x] 3.8 连接 baseURL 和 API Key 输入框到 config 状态管理（使用 `setConfig` 更新 `config.llm.baseURL` 和 `config.llm.openai.apiKey`）

## 4. 测试和验证

- [x] 4.1 在 UI 上验证 "OpenAI-Compatible API" 标签和 subtitle 显示正确
- [x] 4.2 验证信息提示框文案更新正确，说明兼容性
- [x] 4.3 测试 baseURL 输入框：留空时使用默认 OpenAI endpoint，填写自定义 URL 时正确保存到 config
- [x] 4.4 测试 API Key 输入框：填写后正确保存到 `config.llm.openai.apiKey`，密码字段正确遮盖
- [x] 4.5 测试 API Key 优先级逻辑：config 中有值时使用 config，config 为空时回退到环境变量
- [x] 4.6 测试向后兼容性：现有配置（只有环境变量）仍然正常工作
- [x] 4.7 执行 `npm run build` 构建前端和后端，确保无 TypeScript 错误
- [x] 4.8 重启 daemon，访问 http://localhost:10010/settings 验证 UI 更新已生效
