## ADDED Requirements

### Requirement: 系统架构文档

系统必须提供架构文档，解释核心模块、数据流和技术选型。

#### Scenario: 理解系统设计
- **WHEN** 新开发者阅读架构文档
- **THEN** 开发者理解系统的整体架构和各模块职责

### Requirement: 模块划分说明

文档必须清晰说明各模块的职责和依赖关系。

#### Scenario: 定位功能模块
- **WHEN** 开发者需要修改"偏好学习"功能
- **THEN** 文档指明该功能在 `src/learners/preference-learner.ts` 中实现

### Requirement: 数据流图

文档必须包含数据流图，展示从会话收集到配置生成的完整流程。

#### Scenario: 理解数据处理流程
- **WHEN** 开发者查看数据流图
- **THEN** 开发者能清晰看到：Session → Collector → Extractor → Learner → Generator 的流程

### Requirement: 技术决策记录

文档必须记录关键技术决策及其理由（如为何使用 HTTP API 而非 MCP）。

#### Scenario: 理解技术选型
- **WHEN** 开发者疑惑为何未使用 MCP 协议
- **THEN** 文档说明构建错误和 HTTP API 替代方案的决策过程
