## Why

claude-evolution 项目已达到 MVP 状态，核心功能完整（数据收集、经验提取、偏好学习、CLI 工具和 Web UI）。然而，0% 的测试覆盖率和不完整的文档使代码库缺乏可持续开发和生产可靠性所需的质量保障基础。Phase 1 质量保障通过建立稳固的测试框架、完善文档和补全关键 CLI 功能来解决这一问题。

## What Changes

- 为核心模块添加单元测试（suggestion-manager、preference-learner、experience-extractor）
- 为 CLI 工作流添加集成测试（init → analyze → review → approve）
- 更新 README.md，添加安装指南和快速开始
- 创建架构文档，解释系统设计
- 为 Web 服务器端点创建 API 文档
- 实现缺失的 CLI 命令（status、history、diff）
- 添加测试覆盖率报告和 CI 集成
- 记录部署和故障排除流程

## Capabilities

### New Capabilities

- `unit-testing`: 核心业务逻辑模块的单元测试套件，目标覆盖率 80%+
- `integration-testing`: CLI 工作流和 API 端点的集成测试
- `project-documentation`: 面向用户的文档（README、快速开始、安装指南）
- `architecture-documentation`: 开发者文档（系统设计、架构决策）
- `cli-status-command`: 状态命令，显示当前配置模式和系统状态
- `cli-history-command`: 历史命令，显示进化日志和学习事件
- `cli-diff-command`: 差异命令，对比原始配置和进化后的配置

### Modified Capabilities

<!-- 没有现有能力的需求变更 - 仅添加测试和文档 -->

## Impact

**新增文件**:
- `src/**/*.test.ts` - 单元测试文件
- `tests/integration/**/*.test.ts` - 集成测试套件
- `docs/ARCHITECTURE.md` - 系统架构文档
- `docs/API.md` - Web 服务器 API 文档
- `docs/DEPLOYMENT.md` - 部署指南
- `src/cli/commands/status.ts` - status 命令实现
- `src/cli/commands/history.ts` - history 命令实现
- `src/cli/commands/diff.ts` - diff 命令实现

**修改文件**:
- `README.md` - 完全重写，包含安装和使用指南
- `package.json` - 添加测试脚本和 CI 配置
- `src/cli/index.ts` - 注册新的 CLI 命令
- `.github/workflows/test.yml` - 添加 CI 流水线（如果使用 GitHub Actions）

**依赖项**:
- 添加 `@vitest/ui` 用于测试 UI（已有 vitest）
- 添加 `c8` 或 `@vitest/coverage-v8` 用于覆盖率报告（已有）
- 无破坏性变更

**对用户的影响**:
- 通过完善文档提升上手体验
- 通过测试覆盖提高可靠性
- 通过 status、history、diff 命令增强 CLI 功能
- 无破坏性变更 - 纯增量改进
