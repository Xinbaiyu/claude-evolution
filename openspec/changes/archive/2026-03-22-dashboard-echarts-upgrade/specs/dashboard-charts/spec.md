## ADDED Requirements

### Requirement: 后端提供统计概览 API

系统 SHALL 提供 `GET /api/stats/overview` 端点，返回看板图表所需的聚合统计数据。

#### Scenario: 成功获取统计概览
- **WHEN** 前端请求 `GET /api/stats/overview`
- **THEN** 返回 JSON 对象包含：
  - `typeDistribution`: 数组，每项含 `type`(string) 和 `count`(number)，按 count 降序排列
  - `analysisTrend`: 数组，每项含 `date`(YYYY-MM-DD)、`runCount`(number)、`mergedCount`(number)，按日期升序排列，覆盖最近 30 天
  - `trendDays`: number，表示趋势数据的天数范围

#### Scenario: 无观察数据时的类型分布
- **WHEN** 数据库中没有任何观察记录
- **THEN** `typeDistribution` SHALL 返回空数组 `[]`

#### Scenario: 无分析记录时的趋势数据
- **WHEN** 数据库中没有任何分析运行记录
- **THEN** `analysisTrend` SHALL 返回空数组 `[]`

### Requirement: 前端 API client 提供统计概览方法

前端 API client SHALL 提供 `getStatsOverview()` 方法调用统计概览端点。

#### Scenario: 调用 getStatsOverview
- **WHEN** 调用 `apiClient.getStatsOverview()`
- **THEN** SHALL 返回类型化的 `StatsOverview` 对象
- **AND** 网络错误时 SHALL 返回默认空对象 `{ typeDistribution: [], analysisTrend: [], trendDays: 30 }`

### Requirement: 分析趋势面积图组件

系统 SHALL 提供 `AnalysisTrendChart` React 组件，使用 ECharts 面积图展示近 30 天的分析活跃度趋势。

#### Scenario: 正常渲染趋势图
- **WHEN** `analysisTrend` 数据包含多天的分析记录
- **THEN** 组件 SHALL 渲染双 Y 轴面积图：
  - X 轴：日期
  - Y 轴左：每日分析运行次数（amber 色系面积）
  - Y 轴右：每日合并观察数（cyan 色系面积）
  - 背景透明，文字和轴线使用 slate 色系

#### Scenario: 数据为空时显示空状态
- **WHEN** `analysisTrend` 为空数组
- **THEN** 组件 SHALL 显示空状态提示文字 "运行更多分析以查看趋势"

#### Scenario: 加载中状态
- **WHEN** 数据正在加载
- **THEN** 组件 SHALL 显示 skeleton 占位动画

### Requirement: 观察类型分布环形图组件

系统 SHALL 提供 `TypeDistributionChart` React 组件，使用 ECharts 环形图展示各类型观察的占比。

#### Scenario: 正常渲染分布图
- **WHEN** `typeDistribution` 包含多个类型数据
- **THEN** 组件 SHALL 渲染环形图：
  - 中心显示总数
  - 每个扇区使用不同颜色（amber、cyan、emerald、purple 等）
  - 悬停时显示类型名称和具体数量
  - 图例显示在图表下方

#### Scenario: 数据为空时显示空状态
- **WHEN** `typeDistribution` 为空数组
- **THEN** 组件 SHALL 显示空状态提示

### Requirement: 置信度仪表盘组件

系统 SHALL 提供 `ConfidenceGauge` React 组件，使用 ECharts gauge 图展示系统平均置信度。

#### Scenario: 正常渲染仪表盘
- **WHEN** 传入 `avgConfidence` 值（0-1 范围的小数）
- **THEN** 组件 SHALL 渲染半圆仪表盘：
  - 数值范围 0-100%
  - 色带从 红色(0-40) → 黄色(40-70) → 绿色(70-100)
  - 中心大字显示当前百分比值
  - 指针指向对应位置

#### Scenario: 置信度为 0
- **WHEN** `avgConfidence` 为 0
- **THEN** 仪表盘 SHALL 显示 "0%" 并指针指向最左端

### Requirement: ECharts 暗色主题配置

系统 SHALL 提供自定义 ECharts 主题 `evolution-dark`，与项目暗色 UI 风格统一。

#### Scenario: 主题颜色一致性
- **WHEN** 任何图表使用 `evolution-dark` 主题渲染
- **THEN** SHALL 使用以下配色：
  - 背景色: transparent
  - 文本色: slate-300 (#cbd5e1)
  - 轴线色: slate-600 (#475569)
  - 主色调色盘: amber-400, cyan-400, emerald-400, purple-400, rose-400
