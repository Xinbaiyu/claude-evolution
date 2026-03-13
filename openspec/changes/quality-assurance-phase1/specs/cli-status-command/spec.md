## ADDED Requirements

### Requirement: 显示配置模式

`claude-evolution status` 命令必须显示当前配置模式（enabled/disabled）。

#### Scenario: 查看配置状态
- **WHEN** 用户运行 `claude-evolution status`
- **THEN** 输出显示配置模式为 "已启用" 或 "已禁用"

### Requirement: 显示上次分析时间

命令必须显示上次成功执行分析的时间。

#### Scenario: 查看分析时间
- **WHEN** 用户运行 `claude-evolution status`
- **THEN** 输出显示如 "上次分析: 2026-03-13 14:30"

### Requirement: 显示待审批数量

命令必须显示当前待审批建议的数量。

#### Scenario: 查看待审批建议
- **WHEN** 用户运行 `claude-evolution status`
- **THEN** 输出显示如 "待审批建议: 5 个"

### Requirement: 显示系统健康状态

命令必须检查关键文件和配置的存在性，报告系统健康状态。

#### Scenario: 配置完整性检查
- **WHEN** 用户运行 `claude-evolution status`
- **THEN** 输出显示配置目录、必需文件的状态（✓ 或 ✗）

#### Scenario: 配置损坏警告
- **WHEN** 关键配置文件缺失
- **THEN** 命令输出警告信息，提示运行 `claude-evolution init` 修复
