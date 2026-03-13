## ADDED Requirements

### Requirement: CLI 工作流集成测试

系统必须为完整的 CLI 工作流（init → analyze → review → approve）提供集成测试。

#### Scenario: 完整工作流测试
- **WHEN** 测试依次执行 init、analyze、review、approve 命令
- **THEN** 每个命令成功完成，最终生成更新的 CLAUDE.md 文件

#### Scenario: 错误处理测试
- **WHEN** 测试在未初始化的目录执行 analyze 命令
- **THEN** 系统返回清晰的错误消息，提示先运行 init 命令

### Requirement: Web API 端点测试

系统必须为所有 REST API 端点提供集成测试。

#### Scenario: 获取建议列表测试
- **WHEN** 测试请求 GET /api/suggestions
- **THEN** 返回 200 状态码和建议列表 JSON

#### Scenario: 批量批准测试
- **WHEN** 测试发送 POST /api/suggestions/batch-approve
- **THEN** 返回 200 状态码，所有指定建议被批准

### Requirement: 真实文件系统操作

集成测试必须使用真实的文件系统（临时目录）而非 mock，以验证实际场景。

#### Scenario: 文件创建和读取测试
- **WHEN** 测试执行创建配置文件的操作
- **THEN** 文件在临时目录中真实创建，后续读取操作能正确获取内容

### Requirement: 测试环境隔离

每个集成测试必须在独立的临时目录中运行，测试后自动清理。

#### Scenario: 临时目录清理
- **WHEN** 集成测试完成（成功或失败）
- **THEN** 临时目录及其所有内容被删除
