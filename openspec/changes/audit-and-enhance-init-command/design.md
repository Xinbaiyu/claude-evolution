## 上下文

**当前状态：**
- Init 命令位于 `src/cli/commands/init.ts`（约 500 行）
- 仅提示 4 个配置区域：API 模式、学习阶段、调度器、模板文件
- ConfigSchema 定义了 12 个主要配置区域（80+ 选项）
- 用户只能通过手动编辑 `~/.claude-evolution/config.json` 或使用 `config set` 来配置缺失的选项

**约束条件：**
- 不能破坏现有配置文件格式
- Init 流程不能太长（避免用户流失）
- 需要支持新手和高级用户两种场景
- 命令行交互使用 inquirer.js（已有依赖）

**利益相关方：**
- 新用户：需要简单、快速的初始化体验
- 高级用户：需要完整的配置选项访问
- 维护者：需要可维护的代码结构

## 目标 / 非目标

**目标：**
- ✅ 识别并移除 init 中的冗余/废弃配置选项
- ✅ 为核心缺失功能添加配置提示（LLM、提醒、Bot、学习容量）
- ✅ 实现渐进式披露 UX（基础模式 + 高级模式）
- ✅ 添加配置验证（防止无效输入）
- ✅ 保持向后兼容

**非目标：**
- ❌ 修改配置文件格式或 schema 结构
- ❌ 重写整个 CLI 架构
- ❌ 添加 GUI 配置工具
- ❌ 自动迁移旧配置（由 config-loader 处理）

## 决策

### 决策 1：渐进式披露模式

**方案：**两阶段配置流程
1. **基础模式**（默认）：只提示核心必选项（< 10 个问题）
2. **高级模式**（可选）：提示所有可配置项（~30 个问题）

**理由：**
- ✅ 新用户可以快速完成初始化（< 2 分钟）
- ✅ 高级用户可以一次性完成完整配置
- ✅ 避免强制用户回答 80+ 个问题

**备选方案被拒绝：**
- ❌ 全部提示（太长，用户体验差）
- ❌ 全部跳过（失去 init 的意义）
- ❌ 按功能模块分批次运行（过于复杂）

### 决策 2：配置项优先级分级

**优先级分类：**

**P0 - 核心必选**（基础模式）：
- LLM Provider 选择（claude/openai/ccr）
- 调度器配置（interval + scheduleTimes）
- 学习阶段配置（observation/suggestion duration）
- Daemon 日志级别（info/warn/error/debug）

**P1 - 重要可选**（高级模式）：
- Web UI 端口和主机
- 提醒系统（desktop/webhook）
- Bot 集成（DingTalk/CC）
- 学习容量偏好（targetSize/maxSize）
- LLM 详细参数（temperature/maxTokens）

**P2 - 高级可选**（仅文档说明，不在 init 中提示）：
- HTTP API 超时配置
- 数据过滤规则
- MD 生成器选项
- 日志轮转配置

**理由：**
- 基于功能使用频率和影响范围划分
- P0 选项影响系统核心功能
- P1 选项提升体验但有合理默认值
- P2 选项极少被修改

### 决策 3：配置验证策略

**验证点：**
1. **输入时验证**（inquirer validate 函数）
   - 端口范围（1-65535）
   - 时间格式（HH:MM）
   - URL 格式（http/https）
   - 数值范围（capacity, threshold）

2. **提交前验证**（ConfigSchema.parse）
   - 使用 Zod schema 验证完整配置
   - 捕获并友好展示验证错误

**理由：**
- 早期验证减少配置错误
- 利用现有 Zod schema 避免重复验证逻辑

### 决策 4：废弃选项处理

**移除的选项：**
- `llm.baseURL` 单独提示 → 合并到多 Provider 配置中
- 旧的 "Router Mode" 选择 → 改为 CCR Provider 选项

**保留的选项：**
- 学习阶段配置（仍在使用）
- 调度器配置（仍在使用）
- 模板文件创建（CORE.md/STYLE.md/CODING.md）

**理由：**
- LLM 配置已重构为多 Provider 嵌套结构（见 ConfigSchema）
- 旧的 Router Mode 是单 Provider 时代的产物

### 决策 5：代码结构重构

**新结构：**
```
src/cli/commands/init.ts
├── promptBasicConfig()   // 基础模式提示
├── promptAdvancedConfig()  // 高级模式提示
├── promptLLMConfig()     // LLM 多 Provider 配置
├── promptScheduler()     // 调度器配置
├── promptReminders()     // 提醒系统配置
├── promptBotIntegrations()  // Bot 集成配置
├── validateConfig()      // 配置验证
└── main()                // 主流程
```

**理由：**
- 当前 init.ts 是单个 500 行函数，难以维护
- 模块化后每个函数职责清晰
- 便于单元测试

## 风险 / 权衡

### 风险 1：Init 流程变长导致用户流失
**缓解措施：**
- 默认基础模式（< 10 个问题）
- 显示进度条（"配置 3/8"）
- 允许 Ctrl+C 中断并保存部分配置
- 提供 `--quick` flag 跳过所有可选项

### 风险 2：高级选项仍然不够详细
**缓解措施：**
- 在提示中添加 "编辑 config.json 可配置更多选项" 的提示
- 文档中列出所有可配置项的清单
- 保留 `config set` 命令用于精细调整

### 风险 3：多 Provider LLM 配置复杂度
**缓解措施：**
- 默认只配置一个 Provider（用户选择）
- 其他 Provider 配置留空（使用 DEFAULT_CONFIG）
- 提供示例提示："如果使用 OpenAI，选择 openai；如果使用 MatrixLLM，选择 openai 并填写 baseURL"

### 风险 4：配置验证可能阻塞用户
**缓解措施：**
- 验证失败时提供清晰的错误信息
- 允许用户重新输入（不强制退出）
- 提供 `--skip-validation` flag（仅用于调试）

## 迁移计划

**部署步骤：**
1. 在新分支开发和测试
2. 添加单元测试覆盖新的提示函数
3. 手动测试两种模式（基础 + 高级）
4. 更新 README 文档
5. 合并到主分支
6. 发布新版本

**回滚策略：**
- 保留旧的 init.ts 作为 init.ts.bak
- 如果出现严重问题，恢复旧版本并 hotfix

**向后兼容性：**
- 现有 config.json 文件不受影响
- 用户可以重新运行 `init` 覆盖旧配置
- 或使用 `config set` 增量更新

## 未决问题

1. **是否需要添加 `--interactive` 和 `--non-interactive` flag？**
   - 可能场景：CI/CD 环境需要非交互式初始化
   - 建议：添加 `--defaults` flag 使用全部默认值

2. **是否支持从现有 config.json 加载并编辑？**
   - 当前 init 总是创建新配置
   - 建议：如果检测到现有配置，询问用户"覆盖/合并/退出"

3. **Bot 配置（DingTalk）需要 clientId/clientSecret，如何安全提示？**
   - 建议：使用 inquirer password 类型隐藏输入
   - 或提示用户使用环境变量（更安全）

4. **学习容量配置对新用户来说太复杂，如何简化？**
   - 建议：提供预设选项
     - "保守"（targetSize: 30, maxSize: 40）
     - "标准"（targetSize: 50, maxSize: 60）
     - "激进"（targetSize: 80, maxSize: 100）
     - "自定义"（手动输入）
