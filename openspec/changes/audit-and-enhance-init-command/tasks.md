## 1. 准备工作和代码审计

- [ ] 1.1 阅读现有 src/cli/commands/init.ts 完整实现（约 500 行）
- [ ] 1.2 审计当前 init 提示项与 ConfigSchema 对比，列出冗余和缺失项
- [ ] 1.3 确认废弃选项列表（Router Mode、单独的 llm.baseURL 提示）
- [ ] 1.4 创建 src/cli/commands/init.ts.bak 备份文件

## 2. 核心重构：模块化函数拆分

- [ ] 2.1 创建 promptBasicConfig() 函数框架（返回 P0 配置对象）
- [ ] 2.2 创建 promptAdvancedConfig() 函数框架（返回 P1 配置对象）
- [ ] 2.3 创建 promptLLMConfig() 函数处理多 Provider 配置
- [ ] 2.4 创建 promptScheduler() 函数处理调度器配置（interval/scheduleTimes 两种模式）
- [ ] 2.5 创建 promptReminders() 函数处理提醒系统配置（desktop/webhook）
- [ ] 2.6 创建 promptBotIntegrations() 函数处理 Bot 集成配置（DingTalk/CC）
- [ ] 2.7 创建 validateConfig() 函数使用 ConfigSchema.parse 验证完整配置
- [ ] 2.8 重构 main() 函数为流程编排函数，调用各模块函数

## 3. P0 核心配置实现

- [ ] 3.1 实现 LLM Provider 选择提示（claude/openai/ccr 三选一）
- [ ] 3.2 实现 Claude Official API 配置提示（apiKey, model 选择）
- [ ] 3.3 实现 OpenAI-Compatible API 配置提示（baseURL, apiKey, model 输入）
- [ ] 3.4 实现 CCR Proxy 配置提示（port, model 选择）
- [ ] 3.5 实现调度器 interval 模式配置提示（间隔分钟数）
- [ ] 3.6 实现调度器 scheduleTimes 模式配置提示（时间点列表，HH:MM 格式）
- [ ] 3.7 实现学习阶段配置提示（observation duration, suggestion duration）
- [ ] 3.8 实现 Daemon 日志级别配置提示（info/warn/error/debug 选择）

## 4. P1 高级配置实现

- [ ] 4.1 实现 Web UI 端口配置提示（默认 10010，范围 1-65535）
- [ ] 4.2 实现 Web UI 主机配置提示（默认 localhost）
- [ ] 4.3 实现桌面通知配置提示（enabled, sound 可选）
- [ ] 4.4 实现 Webhook 通知配置提示（enabled, endpoints URL 列表）
- [ ] 4.5 实现钉钉机器人配置提示（clientId, clientSecret 使用 password 类型）
- [ ] 4.6 实现 CC 机器人配置提示（enabled, budget, permissionMode）
- [ ] 4.7 实现学习容量预设选项（保守/标准/激进/自定义）
- [ ] 4.8 实现 LLM 详细参数配置提示（temperature slider, maxTokens）

## 5. 配置验证实现

- [ ] 5.1 添加端口号输入验证（1-65535 范围检查）
- [ ] 5.2 添加时间格式输入验证（HH:MM 正则表达式）
- [ ] 5.3 添加 URL 格式输入验证（http/https 协议检查）
- [ ] 5.4 添加学习容量数值范围验证（targetSize < maxSize, 10-200 范围）
- [ ] 5.5 添加 API Key 非空验证（必填字段检查）
- [ ] 5.6 集成 ConfigSchema.parse 完整配置验证
- [ ] 5.7 添加验证错误友好展示（捕获 Zod 错误并格式化输出）

## 6. 渐进式 UX 实现

- [ ] 6.1 实现进度指示器（显示 "配置 X/Y"）
- [ ] 6.2 实现基础模式完成后询问 "是否配置高级选项？"
- [ ] 6.3 实现 --advanced flag 支持直接进入高级模式
- [ ] 6.4 实现 --quick flag 支持快速初始化（仅必填项 + 全部默认值）
- [ ] 6.5 实现 Ctrl+C 中断处理（捕获 SIGINT，询问是否保存部分配置）
- [ ] 6.6 实现现有配置文件检测（询问覆盖/合并/退出）

## 7. 废弃选项清理

- [ ] 7.1 移除旧的 Router Mode 选择提示代码
- [ ] 7.2 移除单独的 llm.baseURL 全局提示代码
- [ ] 7.3 验证移除后不影响现有配置文件加载（向后兼容）

## 8. 引导提示和文档

- [ ] 8.1 添加配置完成后的引导信息输出（config.json 路径，config set 命令提示）
- [ ] 8.2 添加敏感信息安全提示（建议使用环境变量存储 API Key）
- [ ] 8.3 更新 README.md 中的 init 命令文档
- [ ] 8.4 添加 --help 输出说明 --advanced 和 --quick flag 用法

## 9. 单元测试

- [ ] 9.1 为 promptLLMConfig() 函数编写单元测试（三种 Provider 场景）
- [ ] 9.2 为 promptScheduler() 函数编写单元测试（interval/scheduleTimes 场景）
- [ ] 9.3 为 validateConfig() 函数编写单元测试（有效/无效配置场景）
- [ ] 9.4 为输入验证函数编写单元测试（端口/时间/URL 格式）
- [ ] 9.5 Mock inquirer.prompt 测试完整交互流程

## 10. 集成测试和验证

- [ ] 10.1 手动测试基础模式完整流程（选择不同 Provider）
- [ ] 10.2 手动测试高级模式完整流程（配置所有 P1 选项）
- [ ] 10.3 手动测试 --quick flag 快速初始化
- [ ] 10.4 手动测试现有配置文件覆盖/合并场景
- [ ] 10.5 手动测试 Ctrl+C 中断保存场景
- [ ] 10.6 验证生成的 config.json 通过 ConfigSchema.parse
- [ ] 10.7 验证生成的配置可以成功启动 daemon（claude-evolution start）

## 11. 部署和回滚准备

- [ ] 11.1 确认 init.ts.bak 备份文件存在
- [ ] 11.2 合并代码到主分支
- [ ] 11.3 发布新版本（版本号增量）
- [ ] 11.4 准备回滚文档（如何恢复到旧版 init）
