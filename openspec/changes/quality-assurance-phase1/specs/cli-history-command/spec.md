## ADDED Requirements

### Requirement: 显示最近操作历史

`claude-evolution history` 命令必须显示最近的批准和拒绝操作。

#### Scenario: 查看最近 10 条历史
- **WHEN** 用户运行 `claude-evolution history`
- **THEN** 输出显示最近 10 条操作，包括时间、操作类型、建议 ID

### Requirement: 支持历史记录过滤

命令必须支持按操作类型（批准/拒绝）过滤历史记录。

#### Scenario: 仅查看批准记录
- **WHEN** 用户运行 `claude-evolution history --type=approved`
- **THEN** 输出仅显示批准操作的历史记录

### Requirement: 支持自定义数量

命令必须支持通过参数指定显示的记录数量。

#### Scenario: 查看最近 50 条历史
- **WHEN** 用户运行 `claude-evolution history --limit=50`
- **THEN** 输出显示最近 50 条操作记录

### Requirement: 显示建议详情

对于每条历史记录，必须显示建议的简要内容。

#### Scenario: 查看建议摘要
- **WHEN** 用户查看历史记录
- **THEN** 每条记录显示建议类型和描述（如 "Preference: 使用中文编写文档"）
