## 为什么要做这个改动

`claude-evolution init` 命令目前只提示用户配置 8 个选项，而 ConfigSchema 定义了 80+ 个可配置项。关键功能如提醒系统、机器人集成、学习容量调优、多 Provider LLM 配置等在初始化时完全被跳过，迫使用户手动编辑 `config.json` 或通过试错来发现这些功能。这导致首次运行体验不佳，高级功能利用率低。

## 变更内容

- **审计现有 init 提示项** - 与当前 ConfigSchema 对比，找出冗余和缺失
- **移除冗余选项** - 删除已废弃功能或未使用的配置路径
- **添加核心缺失提示** - 为高价值功能添加配置引导：
  - 多 Provider LLM 配置（Claude、OpenAI、CCR 选择）
  - Web UI 端口和主机配置
  - 提醒系统（桌面通知、Webhook 集成）
  - 机器人集成（钉钉、Claude Code 远程执行）
  - 学习容量偏好（保守 vs 激进裁剪）
  - Daemon 日志级别（info/warn/error/debug）
- **改进 UX** - 渐进式披露：新手基础配置，高级用户进阶选项
- **添加验证** - 防止 init 过程中产生无效配置

## 功能模块

### 新增功能模块
- `init-wizard-enhancement`: 增强的初始化向导，覆盖完整配置项，渐进式 UX，带验证

### 修改的功能模块
<!-- 不涉及现有 spec 功能模块的修改，仅增强 init 命令实现 -->

## 影响范围

**代码变更：**
- `src/cli/commands/init.ts` - 重大重构，添加缺失提示，移除冗余项
- `src/config/schema.ts` - 验证规则参考
- `src/config/loader.ts` - 可能需要添加验证辅助函数

**用户体验：**
- 首次配置更全面
- 用户在 init 阶段即可发现高级功能
- 减少配置后手动编辑 config.json 的需求
- 注意：init 流程会变长（但高级选项可选择跳过）

**文档：**
- README.md - 更新 init 命令文档
- 可能新增 `docs/INIT_GUIDE.md` 详细配置指南

**向后兼容性：**
- 现有 config.json 文件保持有效
- 已运行过 init 的用户可以重新运行或使用 `config set`
- 配置文件格式无破坏性变更
