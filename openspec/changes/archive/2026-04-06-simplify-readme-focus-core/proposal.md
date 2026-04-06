## Why

当前 README.md 包含 1000+ 行内容，覆盖了项目的方方面面（CLI 命令、Web UI、测试、故障排查等），导致新用户难以快速理解项目的核心价值和启动流程。需要精简 README，只聚焦于最核心的两个部分：如何初始化项目 + 自动分析架构设计。

## What Changes

**BREAKING**: 大幅精简 README.md，从 1000+ 行减少到约 200-300 行

**移除内容**：
- ✅ 删除 CLI 命令详细说明（init 除外）
- ✅ 删除 Web UI 使用指南
- ✅ 删除开发指南（测试、代码质量等）
- ✅ 删除故障排查章节
- ✅ 删除配置选项详细说明
- ✅ 删除 API 参考
- ✅ 删除路线图和版本历史
- ✅ 删除贡献指南

**保留内容**：
- ✅ 项目简介和核心特性（精简版）
- ✅ **快速开始 - 初始化流程**（详细说明 P0/P1/P2 配置）
- ✅ **系统架构 - 自动分析流程**（核心组件和数据流）
- ✅ 基本的前置条件说明

**新增提示**：
- 在 README 开头添加"详细文档请参考 docs/ 目录"的引导
- 建议将删除的内容迁移到 docs/ 目录下的独立文档

## Capabilities

### New Capabilities
- `readme-structure`: README 新结构规范（4 个核心章节）

### Modified Capabilities
<!-- 无现有 capability 的 requirement 变更 -->

## Impact

**文件变更**：
- `README.md`: 大幅精简（约 70% 内容移除）

**用户体验**：
- ✅ 新用户可在 5 分钟内完成项目初始化
- ✅ 架构图清晰展示自动分析流程
- ⚠️ 用户需要查阅 docs/ 目录获取详细使用说明

**文档迁移需求**：
建议将以下内容迁移到独立文档：
- `docs/CLI_REFERENCE.md`: CLI 命令完整参考
- `docs/WEB_UI_GUIDE.md`: Web UI 使用指南
- `docs/TROUBLESHOOTING.md`: 故障排查
- `docs/CONFIGURATION.md`: 配置选项详解
