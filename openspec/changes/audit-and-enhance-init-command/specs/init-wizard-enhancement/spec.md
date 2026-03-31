## ADDED Requirements

### Requirement: 基础配置模式提示核心选项
系统 SHALL 在基础配置模式下提示用户配置所有 P0 核心必选项，包括 LLM Provider 选择、调度器配置、学习阶段配置和 Daemon 日志级别。

#### Scenario: 用户运行 init 命令默认进入基础模式
- **WHEN** 用户运行 `claude-evolution init` 命令且未指定 `--advanced` flag
- **THEN** 系统提示用户配置 LLM Provider（claude/openai/ccr）、调度器 interval 和 scheduleTimes、学习阶段 observation 和 suggestion duration、Daemon 日志级别
- **THEN** 系统显示进度指示器显示当前进度（如 "配置 3/8"）
- **THEN** 基础模式问题总数少于 10 个

#### Scenario: 用户在基础模式完成所有必选项后生成有效配置
- **WHEN** 用户在基础模式下回答所有必选项问题
- **THEN** 系统生成包含所有 P0 配置项的 `~/.claude-evolution/config.json` 文件
- **THEN** 配置文件通过 ConfigSchema.parse 验证

### Requirement: 高级配置模式提示所有可配置项
系统 SHALL 在高级配置模式下提示用户配置所有 P0 和 P1 配置项，包括 Web UI、提醒系统、Bot 集成、学习容量和 LLM 详细参数。

#### Scenario: 用户运行 init 命令指定 advanced flag 进入高级模式
- **WHEN** 用户运行 `claude-evolution init --advanced` 命令
- **THEN** 系统提示所有 P0 配置项
- **THEN** 系统额外提示 P1 配置项：Web UI 端口和主机、提醒系统（desktop/webhook）、Bot 集成（DingTalk/CC）、学习容量偏好（targetSize/maxSize）、LLM 详细参数（temperature/maxTokens）
- **THEN** 高级模式问题总数约 30 个

#### Scenario: 基础模式完成后询问用户是否继续高级配置
- **WHEN** 用户在基础模式完成所有 P0 配置
- **THEN** 系统询问用户 "是否配置高级选项？"
- **THEN** 如果用户选择 "是"，系统进入高级配置流程提示 P1 配置项
- **THEN** 如果用户选择 "否"，系统跳过 P1 配置并保存配置文件

### Requirement: LLM Provider 多 Provider 配置
系统 SHALL 支持配置多个 LLM Provider（Claude Official、OpenAI-Compatible、CCR Proxy），并为每个 Provider 提供相应的配置选项。

#### Scenario: 用户选择 Claude Official API 作为 LLM Provider
- **WHEN** 用户在 LLM Provider 选择中选择 "claude"
- **THEN** 系统提示用户配置 API Key（使用 inquirer password 类型隐藏输入）
- **THEN** 系统提示用户选择模型（从 claude-opus-4.6, claude-sonnet-4.6, claude-haiku-4.5 中选择）
- **THEN** 系统在高级模式下额外提示 temperature 和 maxTokens 配置

#### Scenario: 用户选择 OpenAI-Compatible API 作为 LLM Provider
- **WHEN** 用户在 LLM Provider 选择中选择 "openai"
- **THEN** 系统提示用户配置 Base URL（默认 https://api.openai.com）
- **THEN** 系统提示用户配置 API Key（使用 inquirer password 类型隐藏输入）
- **THEN** 系统提示用户配置 Model 名称（如 gpt-4-turbo, deepseek-chat, qwen-turbo）
- **THEN** 系统在高级模式下额外提示 organization、temperature 和 maxTokens 配置

#### Scenario: 用户选择 CCR Proxy 作为 LLM Provider
- **WHEN** 用户在 LLM Provider 选择中选择 "ccr"
- **THEN** 系统提示用户配置 CCR 端口（默认 3456）
- **THEN** 系统提示用户选择模型（从支持的 Claude 模型列表中选择）

### Requirement: 调度器配置支持两种模式
系统 SHALL 支持配置调度器为间隔模式（interval）或定时模式（scheduleTimes）。

#### Scenario: 用户选择间隔模式配置调度器
- **WHEN** 用户在调度器配置中选择 "interval" 模式
- **THEN** 系统提示用户输入间隔时间（分钟）
- **THEN** 系统验证输入值为正整数且在合理范围内（如 5-1440 分钟）

#### Scenario: 用户选择定时模式配置调度器
- **WHEN** 用户在调度器配置中选择 "scheduleTimes" 模式
- **THEN** 系统提示用户输入定时时间点列表（如 "11:30, 15:30, 18:00"）
- **THEN** 系统验证每个时间点格式为 HH:MM
- **THEN** 系统验证时间点在 00:00-23:59 范围内

### Requirement: 学习容量配置提供预设选项
系统 SHALL 为学习容量配置提供预设选项（保守/标准/激进/自定义），简化新用户配置体验。

#### Scenario: 用户选择预设学习容量配置
- **WHEN** 用户在高级模式学习容量配置中选择 "标准" 预设
- **THEN** 系统自动设置 targetSize 为 50，maxSize 为 60
- **THEN** 用户无需手动输入数值

#### Scenario: 用户选择自定义学习容量配置
- **WHEN** 用户在高级模式学习容量配置中选择 "自定义" 选项
- **THEN** 系统提示用户输入 targetSize 和 maxSize 数值
- **THEN** 系统验证 targetSize < maxSize
- **THEN** 系统验证数值在合理范围内（如 10-200）

### Requirement: 配置验证防止无效输入
系统 SHALL 在输入时和提交前验证配置，防止无效配置保存到文件。

#### Scenario: 端口号输入验证
- **WHEN** 用户输入 Web UI 端口号
- **THEN** 系统使用 inquirer validate 函数验证端口号在 1-65535 范围内
- **THEN** 如果验证失败，系统显示错误信息并要求用户重新输入

#### Scenario: 时间格式输入验证
- **WHEN** 用户输入调度器定时时间点
- **THEN** 系统验证每个时间点格式匹配 HH:MM 正则表达式
- **THEN** 如果验证失败，系统显示 "时间格式应为 HH:MM（如 09:30）" 并要求用户重新输入

#### Scenario: URL 格式输入验证
- **WHEN** 用户输入 OpenAI Base URL 或 Webhook URL
- **THEN** 系统验证 URL 格式以 http:// 或 https:// 开头
- **THEN** 如果验证失败，系统显示错误信息并要求用户重新输入

#### Scenario: 完整配置提交前验证
- **WHEN** 用户完成所有配置项输入
- **THEN** 系统使用 ConfigSchema.parse 验证完整配置对象
- **THEN** 如果验证失败，系统捕获 Zod 验证错误并友好展示给用户
- **THEN** 系统允许用户选择重新输入或退出

### Requirement: 提醒系统配置支持多种通知渠道
系统 SHALL 在高级模式下支持配置提醒系统的桌面通知和 Webhook 集成。

#### Scenario: 用户配置桌面通知提醒
- **WHEN** 用户在高级模式提醒系统配置中启用桌面通知
- **THEN** 系统设置 reminders.desktop.enabled 为 true
- **THEN** 系统提示用户配置通知声音选项（可选）

#### Scenario: 用户配置 Webhook 提醒
- **WHEN** 用户在高级模式提醒系统配置中启用 Webhook
- **THEN** 系统提示用户输入 Webhook URL 列表（逗号分隔）
- **THEN** 系统验证每个 URL 格式
- **THEN** 系统设置 reminders.webhook.enabled 为 true 和 endpoints 数组

### Requirement: Bot 集成配置支持钉钉和 CC 机器人
系统 SHALL 在高级模式下支持配置钉钉机器人和 CC 机器人集成。

#### Scenario: 用户配置钉钉机器人集成
- **WHEN** 用户在高级模式 Bot 集成配置中启用钉钉机器人
- **THEN** 系统提示用户输入 clientId 和 clientSecret（使用 inquirer password 类型）
- **THEN** 系统提示 "建议使用环境变量存储敏感信息（DINGTALK_CLIENT_ID, DINGTALK_CLIENT_SECRET）"
- **THEN** 系统设置 bot.dingtalk.enabled 为 true

#### Scenario: 用户配置 CC 机器人集成
- **WHEN** 用户在高级模式 Bot 集成配置中启用 CC 机器人
- **THEN** 系统提示用户配置 Claude Code 远程执行预算限制（默认 0.5 美元）
- **THEN** 系统提示用户选择权限模式（bypass/normal）
- **THEN** 系统设置 bot.cc.enabled 为 true

### Requirement: 快速初始化模式跳过所有可选项
系统 SHALL 支持 `--quick` flag 跳过所有可选配置项，使用全部默认值快速完成初始化。

#### Scenario: 用户运行 quick 模式初始化
- **WHEN** 用户运行 `claude-evolution init --quick` 命令
- **THEN** 系统仅提示绝对必须的配置项（LLM Provider 和 API Key）
- **THEN** 系统为所有其他配置项使用默认值
- **THEN** 系统在 30 秒内完成配置生成

### Requirement: 支持中断保存部分配置
系统 SHALL 允许用户在 init 过程中按 Ctrl+C 中断，并保存已完成的部分配置。

#### Scenario: 用户中途中断 init 命令
- **WHEN** 用户在 init 过程中按 Ctrl+C
- **THEN** 系统捕获 SIGINT 信号
- **THEN** 系统询问用户 "是否保存已完成的配置？"
- **THEN** 如果用户选择 "是"，系统将已完成的配置项保存到 config.json
- **THEN** 如果用户选择 "否"，系统退出且不保存

### Requirement: 检测现有配置文件并提供合并选项
系统 SHALL 在检测到现有 config.json 文件时，询问用户选择覆盖、合并或退出。

#### Scenario: 用户在已有配置的目录运行 init
- **WHEN** 用户运行 `claude-evolution init` 且 ~/.claude-evolution/config.json 已存在
- **THEN** 系统显示 "检测到现有配置文件"
- **THEN** 系统询问用户选择 "覆盖现有配置 / 合并到现有配置 / 退出"
- **THEN** 如果用户选择 "覆盖"，系统删除旧配置并创建新配置
- **THEN** 如果用户选择 "合并"，系统加载现有配置作为初始值，并仅提示缺失的配置项
- **THEN** 如果用户选择 "退出"，系统退出且不修改现有配置

### Requirement: 移除废弃的配置选项
系统 SHALL 移除已废弃的配置选项，包括旧的 Router Mode 选择和单独的 llm.baseURL 提示。

#### Scenario: init 命令不再提示旧的 Router Mode
- **WHEN** 用户运行 `claude-evolution init` 命令
- **THEN** 系统不显示 "选择 Router Mode" 的提示
- **THEN** 系统使用新的 LLM Provider 三选一模式（claude/openai/ccr）替代

#### Scenario: llm.baseURL 合并到 OpenAI Provider 配置中
- **WHEN** 用户选择 OpenAI-Compatible API Provider
- **THEN** 系统在该 Provider 的配置流程中提示 Base URL
- **THEN** 系统不在全局 LLM 配置中单独提示 baseURL

### Requirement: 显示配置引导提示
系统 SHALL 在 init 完成后显示后续配置引导，告知用户如何访问高级配置。

#### Scenario: 基础模式完成后显示引导信息
- **WHEN** 用户完成基础模式配置
- **THEN** 系统显示 "✓ 配置已保存到 ~/.claude-evolution/config.json"
- **THEN** 系统显示 "提示：运行 'claude-evolution config set <key> <value>' 可精细调整配置"
- **THEN** 系统显示 "提示：编辑 ~/.claude-evolution/config.json 可配置更多高级选项"

### Requirement: 代码模块化重构
系统 SHALL 将 init.ts 重构为多个职责清晰的函数模块，便于维护和测试。

#### Scenario: init.ts 文件组织符合模块化结构
- **WHEN** 开发者查看 src/cli/commands/init.ts 文件
- **THEN** 文件包含以下导出函数：promptBasicConfig(), promptAdvancedConfig(), promptLLMConfig(), promptScheduler(), promptReminders(), promptBotIntegrations(), validateConfig(), main()
- **THEN** 每个函数职责单一，行数不超过 100 行
- **THEN** 主流程 main() 函数通过调用各模块函数完成流程编排

#### Scenario: 模块化函数支持单元测试
- **WHEN** 开发者编写 init 命令的单元测试
- **THEN** 可以独立测试 promptLLMConfig() 函数的输入验证逻辑
- **THEN** 可以独立测试 validateConfig() 函数的配置验证逻辑
- **THEN** 可以 mock inquirer 的 prompt 方法测试用户交互流程
