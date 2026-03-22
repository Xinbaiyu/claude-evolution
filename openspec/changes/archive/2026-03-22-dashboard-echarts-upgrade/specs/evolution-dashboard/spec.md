## ADDED Requirements

### Requirement: 看板页面展示 ECharts 数据可视化图表

Dashboard 页面 SHALL 在核心指标行下方展示数据可视化图表区域，包含分析趋势图、观察类型分布图和置信度仪表盘。

#### Scenario: 看板加载时获取图表数据
- **WHEN** Dashboard 页面挂载
- **THEN** SHALL 调用 `apiClient.getStatsOverview()` 获取图表数据
- **AND** 数据加载期间图表区域显示 skeleton 占位

#### Scenario: 图表区域布局
- **WHEN** Dashboard 页面渲染完成且数据加载成功
- **THEN** 指标行下方 SHALL 显示两栏图表布局：
  - 左侧占 2/3 宽度：分析趋势面积图
  - 右侧占 1/3 宽度：观察类型环形图（上）+ 置信度仪表盘（下）

#### Scenario: 图表数据请求失败
- **WHEN** `getStatsOverview()` 请求失败
- **THEN** 图表区域 SHALL 显示简洁的错误提示，不阻塞页面其他内容

### Requirement: 看板布局从双栏变为单栏三段式

Dashboard 页面 SHALL 从当前的 "左主内容 + 右侧边栏" 双栏布局变为单栏三段式布局：指标行、图表区、操作区。

#### Scenario: 近期分析记录移至底部
- **WHEN** Dashboard 页面渲染
- **THEN** RecentAnalysisWidget SHALL 从右侧侧边栏移至页面底部操作区域
- **AND** 与快捷操作按钮并排显示

#### Scenario: 页面内容流
- **WHEN** 用户查看 Dashboard 页面
- **THEN** 页面内容 SHALL 按以下顺序从上到下排列：
  1. 核心指标卡片行（保留现有 4 个指标）
  2. 数据可视化图表区（新增）
  3. 快捷操作 + 近期分析记录（合并后的底部区域）
  4. 系统信息 footer
