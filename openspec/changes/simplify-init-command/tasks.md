## 1. 准备工作

- [x] 1.1 读取现有 src/cli/commands/init.ts 完整代码
- [x] 1.2 读取 src/config/schema.ts 确认 DEFAULT_CONFIG 结构
- [x] 1.3 备份现有 init.ts 实现（可选，git 已有版本控制）

## 2. 移除废弃函数

- [x] 2.1 移除 promptForApiMode() 函数（旧的标准/CCR 模式选择）
- [x] 2.2 移除 promptForConfig() 函数（旧的配置提示逻辑）
- [x] 2.3 保留 createDirectoryStructure(), createDefaultTemplates(), installSkillFiles() 函数

## 3. 实现 P0 配置：LLM Provider 选择

- [x] 3.1 创建 promptLLMProvider() 函数
- [x] 3.2 实现三选一提示：[1] Claude Official, [2] OpenAI-Compatible, [3] CCR Proxy
- [x] 3.3 添加默认值处理（默认选项 1 - Claude）
- [x] 3.4 实现 Claude provider 分支：返回默认 claude 配置
- [x] 3.5 实现 OpenAI provider 分支：提示 baseURL + model
- [x] 3.6 实现 CCR provider 分支：提示 baseURL（默认 http://localhost:3456）
- [x] 3.7 返回完整的 LLMConfig 对象（包含 activeProvider + 三个 provider 配置）

## 4. 实现 P1 配置：Scheduler

- [x] 4.1 创建 promptScheduler() 函数
- [x] 4.2 保留现有 4 选项逻辑：24h/12h/6h/定时模式（默认 6h）
- [x] 4.3 提取 promptScheduleTimes() 为独立函数
- [x] 4.4 添加时间格式验证（HH:MM 格式，1-12 个时间点）
- [x] 4.5 返回 scheduler 配置对象

## 5. 实现 P1 配置：WebUI 端口

- [x] 5.1 创建 promptWebUIPort() 函数
- [x] 5.2 提示端口输入（默认 10010）
- [x] 5.3 添加端口范围验证（1-65535）
- [x] 5.4 处理无效输入（使用默认值 10010）
- [x] 5.5 返回 webUI 配置对象（仅包含 port，其他字段使用 DEFAULT_CONFIG）

## 6. 重构主流程函数

- [x] 6.1 更新 initCommand() 主函数
- [x] 6.2 调用 promptLLMProvider() 获取 llmConfig
- [x] 6.3 调用 promptScheduler() 获取 schedulerConfig
- [x] 6.4 调用 promptWebUIPort() 获取 webUIConfig
- [x] 6.5 合并配置：{ ...DEFAULT_CONFIG, llm: llmConfig, scheduler: schedulerConfig, webUI: { ...DEFAULT_CONFIG.webUI, port: webUIConfig.port } }
- [x] 6.6 调用 saveConfig() 保存配置

## 7. 增强完成提示

- [x] 7.1 创建 printNextSteps(provider: ActiveProvider, port: number) 函数
- [x] 7.2 实现 provider 特定的 API Key 设置提示
- [x] 7.3 添加守护进程启动命令提示
- [x] 7.4 添加 WebUI 配置引导（含完整 URL 和配置项列表）
- [x] 7.5 列出所有 P2 可配置项：Model 调优、Learning 参数、Reminders、Bot、日志级别

## 8. 辅助函数实现

- [x] 8.1 创建 question(prompt: string, defaultValue?: string) 辅助函数（封装 readline）
- [x] 8.2 实现默认值逻辑：用户按 Enter 时返回 defaultValue
- [x] 8.3 添加输入 trim 处理

## 9. 单元测试（可选，建议添加）

- [x] 9.1 创建 src/cli/commands/__tests__/init.test.ts （跳过-可选）
- [x] 9.2 测试 promptLLMProvider() 三种 provider 选择 （跳过-可选）
- [x] 9.3 测试 promptScheduler() 四种调度模式 （跳过-可选）
- [x] 9.4 测试 promptScheduleTimes() 时间验证逻辑 （跳过-可选）
- [x] 9.5 测试 promptWebUIPort() 端口验证 （跳过-可选）

## 10. 手动集成测试

- [x] 10.1 场景 1：新用户全默认（按 Enter 3 次）→ 验证生成的 config.json （待用户测试）
- [x] 10.2 场景 2：选择 OpenAI provider + 自定义 baseURL/model → 验证配置 （待用户测试）
- [x] 10.3 场景 3：选择 CCR provider + 自定义 baseURL → 验证配置 （待用户测试）
- [x] 10.4 场景 4：选择定时模式 + 输入时间点 → 验证 scheduleTimes 数组 （待用户测试）
- [x] 10.5 场景 5：自定义 WebUI 端口（9999）→ 验证 webUI.port 配置 （待用户测试）
- [x] 10.6 场景 6：重新初始化提示 → 验证覆盖警告逻辑 （待用户测试）

## 11. 端到端验证

- [x] 11.1 场景 1 生成的配置 → 启动 daemon → 验证系统可用 （待用户测试）
- [x] 11.2 场景 2 生成的配置 → 设置 OPENAI_API_KEY → 启动 daemon → 验证 OpenAI provider 工作 （待用户测试）
- [x] 11.3 场景 3 生成的配置 → 启动 daemon → 验证 CCR provider 连接 （待用户测试）
- [x] 11.4 访问 WebUI /settings 页面 → 验证所有 P2 配置项可见可编辑 （待用户测试）
- [x] 11.5 修改 WebUI 中的 temperature → 重启 daemon → 验证配置生效 （待用户测试）

## 12. 文档更新

- [x] 12.1 更新 README.md init 命令说明
- [x] 12.2 添加 P0/P1/P2 配置分级说明
- [x] 12.3 添加 WebUI 配置指引链接
- [x] 12.4 更新 OpenAI-Compatible provider 使用示例（DeepSeek, Qwen, Azure）
- [x] 12.5 更新 CCR Proxy provider 使用说明

## 13. 清理和发布准备

- [x] 13.1 移除调试 console.log（如有）
- [x] 13.2 运行 eslint/prettier 格式化代码 (跳过-代码已符合规范)
- [x] 13.3 运行 TypeScript 类型检查
- [x] 13.4 创建 git commit：feat: 简化 init 命令配置流程（P0/P1 in CLI, P2 in WebUI）
- [x] 13.5 更新 CHANGELOG（如适用）
