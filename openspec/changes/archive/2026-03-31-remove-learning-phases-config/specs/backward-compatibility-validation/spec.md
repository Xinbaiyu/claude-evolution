## ADDED Requirements

### Requirement: 配置加载向后兼容
系统 SHALL 能够成功加载包含已删除的 `learningPhases` 字段的旧配置文件，并忽略该字段。

#### Scenario: 加载包含 learningPhases 的旧配置文件
- **WHEN** 用户的 config.json 包含 `learningPhases` 字段（observation, suggestion, automatic）
- **THEN** 系统成功加载配置，不抛出错误
- **THEN** 系统忽略 `learningPhases` 字段，不影响后续功能

#### Scenario: 加载不包含 learningPhases 的新配置文件
- **WHEN** 用户的 config.json 不包含 `learningPhases` 字段
- **THEN** 系统成功加载配置，不抛出错误
- **THEN** 系统使用 `learning.promotion` 配置控制自动提升行为

### Requirement: 状态文件向后兼容
系统 SHALL 能够成功加载包含已删除的 `currentPhase` 字段的旧状态文件，并忽略该字段。

#### Scenario: 加载包含 currentPhase 的旧状态文件
- **WHEN** 用户的 state.json 包含 `currentPhase` 字段（observation/suggestion/automatic）
- **THEN** 系统成功加载状态文件，不抛出错误
- **THEN** 系统忽略 `currentPhase` 字段

#### Scenario: 保存新状态文件不包含 currentPhase
- **WHEN** 系统保存状态文件
- **THEN** 生成的 state.json 不包含 `currentPhase` 字段
- **THEN** state.json 仅包含必要字段：installDate, lastAnalysisTime, lastAnalysisSuccess, totalAnalyses

### Requirement: 自动提升逻辑不受影响
系统 SHALL 继续基于 `learning.promotion` 配置执行自动提升，不受 `learningPhases` 删除的影响。

#### Scenario: 自动提升基于置信度和提及次数
- **WHEN** 系统执行学习循环
- **THEN** 自动提升逻辑使用 `config.learning.promotion.autoConfidence` 阈值（默认 0.90）
- **THEN** 自动提升逻辑使用 `config.learning.promotion.autoMentions` 阈值（默认 10）
- **THEN** 满足两个阈值的观察被自动提升到 Context Pool

#### Scenario: 不满足阈值的观察留在 Active Pool
- **WHEN** 观察的置信度 < autoConfidence 或 提及次数 < autoMentions
- **THEN** 观察保留在 Active Pool
- **THEN** 观察不会被自动提升到 Context Pool

### Requirement: 分析流程正常执行
系统 SHALL 在删除 `learningPhases` 后仍能完整执行分析流程，不产生错误。

#### Scenario: 手动触发分析
- **WHEN** 用户运行 `claude-evolution analyze --now` 命令
- **THEN** 系统完整执行 8 步分析流程
- **THEN** 系统不输出学习阶段相关日志
- **THEN** 系统成功生成 CLAUDE.md

#### Scenario: 定时触发分析
- **WHEN** 调度器触发自动分析
- **THEN** 系统完整执行 8 步分析流程
- **THEN** 系统不输出学习阶段相关日志
- **THEN** 系统成功生成 CLAUDE.md

### Requirement: CLI 命令不显示学习阶段
系统 SHALL 在 CLI 状态命令中不显示学习阶段信息。

#### Scenario: 运行 status 命令
- **WHEN** 用户运行 `claude-evolution status` 命令
- **THEN** 输出不包含"学习阶段"字段
- **THEN** 输出包含学习系统的其他统计信息（Active Pool, Context Pool 大小等）

### Requirement: 单元测试覆盖向后兼容性
系统 SHALL 包含单元测试验证旧配置文件的加载。

#### Scenario: 测试旧配置文件加载
- **WHEN** 运行单元测试
- **THEN** 存在测试用例验证包含 `learningPhases` 的配置可以成功解析
- **THEN** 测试用例验证 Zod schema 忽略未知字段

#### Scenario: 测试状态文件加载
- **WHEN** 运行单元测试
- **THEN** 存在测试用例验证包含 `currentPhase` 的状态文件可以成功加载
- **THEN** 测试用例验证保存的状态文件不包含 `currentPhase`
