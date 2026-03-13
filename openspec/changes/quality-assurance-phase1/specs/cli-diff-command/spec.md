## ADDED Requirements

### Requirement: 对比原始和进化配置

`claude-evolution diff` 命令必须对比原始 CLAUDE.md 和进化后的配置。

#### Scenario: 查看配置差异
- **WHEN** 用户运行 `claude-evolution diff`
- **THEN** 输出高亮显示新增、删除和修改的配置内容

### Requirement: 使用彩色输出

命令必须使用彩色输出标识差异（绿色=新增，红色=删除，黄色=修改）。

#### Scenario: 彩色差异显示
- **WHEN** 用户在支持彩色的终端运行 diff 命令
- **THEN** 新增行显示为绿色，删除行显示为红色

### Requirement: 支持纯文本输出

命令必须支持 `--no-color` 选项，输出纯文本格式的差异。

#### Scenario: 导出差异到文件
- **WHEN** 用户运行 `claude-evolution diff --no-color > diff.txt`
- **THEN** 差异以纯文本格式保存到文件，无 ANSI 颜色代码

### Requirement: 统计差异摘要

命令必须在输出末尾显示差异统计（新增 X 行，删除 Y 行，修改 Z 行）。

#### Scenario: 查看差异摘要
- **WHEN** 用户运行 diff 命令
- **THEN** 输出末尾显示 "新增 15 行，删除 3 行，修改 8 行"

### Requirement: 处理配置未启用场景

当进化配置未启用时，命令必须提示用户。

#### Scenario: 未启用配置的提示
- **WHEN** 用户在未启用进化配置时运行 diff 命令
- **THEN** 输出提示 "进化配置未启用，运行 'claude-evolution switch --enable' 启用"
