## ADDED Requirements

### Requirement: 核心模块单元测试覆盖

系统必须为 suggestion-manager、preference-learner 和 experience-extractor 模块提供单元测试，覆盖率目标为 80%+。

#### Scenario: suggestion-manager 批准建议测试
- **WHEN** 测试调用 `approveSuggestion()` 方法
- **THEN** 建议状态更新，数据写入 approved.json，pending.json 中移除

#### Scenario: preference-learner 冲突检测测试
- **WHEN** 测试提供冲突的偏好数据
- **THEN** 系统正确识别冲突并生成建议而非直接应用

#### Scenario: experience-extractor LLM 调用测试
- **WHEN** 测试 mock LLM API 响应
- **THEN** 提取器正确解析响应并生成结构化数据

### Requirement: 测试隔离性

每个单元测试必须独立运行，不依赖其他测试的状态或执行顺序。

#### Scenario: 并行测试执行
- **WHEN** 多个测试并行运行
- **THEN** 所有测试都能通过，无竞态条件或共享状态问题

### Requirement: 测试性能

整个单元测试套件必须在 30 秒内完成。

#### Scenario: 快速反馈循环
- **WHEN** 开发者运行 `npm test`
- **THEN** 所有单元测试在 30 秒内完成并报告结果

### Requirement: 覆盖率报告

系统必须生成测试覆盖率报告，显示行覆盖率、分支覆盖率和函数覆盖率。

#### Scenario: 生成覆盖率报告
- **WHEN** 运行 `npm run test:coverage`
- **THEN** 系统生成 HTML 覆盖率报告，显示各模块的覆盖率百分比
