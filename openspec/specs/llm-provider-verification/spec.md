## ADDED Requirements

### Requirement: Provider 卡片选择和状态显示

系统 SHALL 在设置页面显示三个 provider 卡片（Claude、OpenAI-Compatible API、CCR），用户 SHALL 能够点击选择任一 provider，被选中的卡片 SHALL 显示高亮边框和阴影效果。

#### Scenario: 选择 Claude provider
- **WHEN** 用户点击 Claude 卡片
- **THEN** Claude 卡片显示蓝色高亮边框和阴影

#### Scenario: 选择 OpenAI-Compatible API provider
- **WHEN** 用户点击 OpenAI-Compatible API 卡片
- **THEN** OpenAI-Compatible API 卡片显示绿色高亮边框和阴影

#### Scenario: 选择 CCR provider
- **WHEN** 用户点击 CCR 卡片
- **THEN** CCR 卡片显示紫色高亮边框和阴影

#### Scenario: 已配置状态显示
- **WHEN** provider 已有保存的配置
- **THEN** 对应卡片右上角显示"✓ 已配置"标记

### Requirement: Provider 配置表单动态渲染

系统 SHALL 根据选中的 provider 类型动态渲染不同的配置表单，表单字段 SHALL 与 provider 类型匹配。

#### Scenario: Claude 表单字段渲染
- **WHEN** 用户选择 Claude provider
- **THEN** 表单显示：Model（下拉选择）、Temperature（滑块）、Max Tokens（数字输入）、Prompt Caching（复选框）

#### Scenario: OpenAI-Compatible 表单字段渲染
- **WHEN** 用户选择 OpenAI-Compatible API provider
- **THEN** 表单显示：Model（自由输入）、Base URL（文本输入）、API Key（密码输入）、Organization ID（文本输入）、Temperature（滑块）、Max Tokens（数字输入）

#### Scenario: CCR 表单字段渲染
- **WHEN** 用户选择 CCR provider
- **THEN** 表单显示：Proxy Endpoint（文本输入，必填）、Model（下拉选择）、Temperature（滑块）、Max Tokens（数字输入）

### Requirement: Model 字段自由输入

OpenAI-Compatible API 模式的 Model 字段 SHALL 支持用户输入任意文本，不受预设选项限制。

#### Scenario: 输入自定义模型名
- **WHEN** 用户在 OpenAI-Compatible 模式的 Model 字段输入 "deepseek-chat"
- **THEN** 输入框接受该值并显示 "deepseek-chat"

#### Scenario: 输入 Azure 部署名
- **WHEN** 用户在 Model 字段输入 "my-gpt4-deployment"
- **THEN** 输入框接受该值并显示 "my-gpt4-deployment"

#### Scenario: 输入 Ollama 模型名
- **WHEN** 用户在 Model 字段输入 "llama2:13b"
- **THEN** 输入框接受该值并显示 "llama2:13b"

### Requirement: Model 历史记录自动补全

系统 SHALL 记录用户输入过的 model 名称，并在下次输入时提供自动补全建议。

#### Scenario: 显示历史记录建议
- **WHEN** 用户曾输入过 "deepseek-chat" 并保存配置
- **THEN** 再次点击 Model 字段时，下拉列表包含 "deepseek-chat"

#### Scenario: 搜索过滤历史记录
- **WHEN** 用户在 Model 字段输入 "deep"
- **THEN** 下拉列表只显示包含 "deep" 的历史记录项（如 "deepseek-chat"）

#### Scenario: 历史记录持久化
- **WHEN** 用户刷新页面
- **THEN** Model 字段的历史记录仍然可用

### Requirement: Provider 切换时保留 model 值

系统 SHALL 在用户切换 provider 时保留当前输入的 model 值，切换回来时恢复该值。

#### Scenario: 切换 provider 后恢复 model
- **WHEN** 用户在 OpenAI 模式输入 model "deepseek-chat"，然后切换到 Claude 模式，再切换回 OpenAI 模式
- **THEN** Model 字段仍显示 "deepseek-chat"

#### Scenario: 空 model 值时使用默认值
- **WHEN** 首次选择 OpenAI provider 且 model 字段为空
- **THEN** Model 字段显示默认值 "gpt-4-turbo"

### Requirement: 配置数据持久化

系统 SHALL 将用户保存的配置写入 `~/.claude-evolution/config/config.json` 文件，并在重启后正确加载。

#### Scenario: 保存 OpenAI 配置
- **WHEN** 用户配置 OpenAI provider（model: "qwen-turbo", baseURL: "https://matrixllm.alipay.com/v1"）并点击"保存配置"
- **THEN** 配置文件包含：`llm.provider: "openai"`, `llm.model: "qwen-turbo"`, `llm.baseURL: "https://matrixllm.alipay.com/v1"`

#### Scenario: 重启后加载配置
- **WHEN** 用户保存配置后重启 daemon
- **THEN** 设置页面显示之前保存的配置值

#### Scenario: 刷新页面后配置保留
- **WHEN** 用户保存配置后刷新浏览器页面
- **THEN** 设置页面显示之前保存的配置值

### Requirement: OpenAI-Compatible API 运行时调用

系统 SHALL 使用配置的 OpenAI-Compatible provider 参数（model、baseURL、apiKey）成功调用 LLM API 并返回响应。

#### Scenario: 成功调用 MatrixLLM
- **WHEN** 配置 OpenAI provider（baseURL: "https://matrixllm.alipay.com/v1", model: "qwen-turbo", 有效 API Key）
- **THEN** LLM 调用返回成功响应

#### Scenario: API Key 无效时返回错误
- **WHEN** 配置 OpenAI provider 但使用无效 API Key
- **THEN** LLM 调用返回认证错误，错误信息提示 API Key 无效

#### Scenario: Base URL 无效时返回错误
- **WHEN** 配置 OpenAI provider 但 baseURL 指向不存在的端点
- **THEN** LLM 调用返回网络错误，错误信息提示连接失败

### Requirement: Provider 检测逻辑

系统 SHALL 根据配置参数正确检测当前使用的 provider 类型，并创建对应的 LLM 客户端实例。

#### Scenario: 检测 OpenAI provider
- **WHEN** 配置中 `llm.provider === "openai"`
- **THEN** 系统创建 OpenAIProvider 实例

#### Scenario: 检测 Claude provider
- **WHEN** 配置中 `llm.provider === "anthropic"` 且 `llm.baseURL` 为空
- **THEN** 系统创建 AnthropicProvider 实例

#### Scenario: 检测 CCR provider
- **WHEN** 配置中 `llm.baseURL` 有值且 `llm.provider` 为空
- **THEN** 系统检测为 CCR 代理模式

### Requirement: UI 提示文本准确性

系统 SHALL 为每个配置字段提供清晰的 helper text，说明字段的用途和格式要求。

#### Scenario: OpenAI Model 字段提示
- **WHEN** 用户查看 OpenAI-Compatible 模式的 Model 字段
- **THEN** 下方显示提示："输入任意模型名称（OpenAI、Azure 部署名、Ollama 自定义模型等）"

#### Scenario: Base URL 字段提示
- **WHEN** 用户查看 OpenAI-Compatible 模式的 Base URL 字段
- **THEN** 下方显示提示："自定义 API 端点（可选）。支持 Azure OpenAI、本地 Ollama 等"

#### Scenario: API Key 安全提示
- **WHEN** 用户查看 OpenAI-Compatible 模式的 API Key 字段
- **THEN** 下方显示提示："留空则使用环境变量 OPENAI_API_KEY。⚠️ API Key 将以明文存储在配置文件中"

### Requirement: 表单验证和错误处理

系统 SHALL 验证必填字段，并在用户提交无效配置时显示错误提示。

#### Scenario: CCR Proxy Endpoint 必填验证
- **WHEN** 用户选择 CCR provider 但 Proxy Endpoint 为空，点击"保存配置"
- **THEN** 系统显示错误提示："Proxy Endpoint 为必填项"

#### Scenario: Temperature 范围验证
- **WHEN** 用户尝试输入 Temperature 值超出 0-1 范围
- **THEN** 系统限制输入在 0-1 之间

#### Scenario: Max Tokens 范围验证
- **WHEN** 用户尝试输入 Max Tokens 小于 1024 或大于 16384
- **THEN** 系统限制输入在 1024-16384 之间
