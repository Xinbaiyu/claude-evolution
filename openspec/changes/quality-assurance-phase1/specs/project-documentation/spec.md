## ADDED Requirements

### Requirement: 完整的 README.md

项目必须提供完整的 README.md，包含项目概述、安装指南和快速开始。

#### Scenario: 新用户 5 分钟上手
- **WHEN** 新用户阅读 README.md
- **THEN** 用户能在 5 分钟内完成安装并运行第一个命令

### Requirement: 安装指南

文档必须包含详细的安装步骤，覆盖不同操作系统（macOS、Linux、Windows）。

#### Scenario: macOS 安装流程
- **WHEN** macOS 用户按照安装指南操作
- **THEN** 用户成功安装并验证 `claude-evolution --version` 命令

#### Scenario: 依赖项检查
- **WHEN** 用户缺少 Node.js 依赖
- **THEN** 文档明确说明如何安装 Node.js

### Requirement: CLI 命令参考

文档必须列出所有 CLI 命令及其参数、选项和示例。

#### Scenario: 查找命令用法
- **WHEN** 用户想了解 `review` 命令的用法
- **THEN** 文档提供命令语法、选项说明和实际示例

### Requirement: 故障排查指南

文档必须包含常见问题和解决方案。

#### Scenario: 权限错误解决
- **WHEN** 用户遇到"权限被拒绝"错误
- **THEN** 文档提供明确的解决步骤
