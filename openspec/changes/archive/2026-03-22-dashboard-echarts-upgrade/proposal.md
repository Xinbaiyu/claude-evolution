## Why

当前看板页面仅使用纯 CSS 进度条和数字卡片展示数据，信息密度低且缺乏趋势洞察。用户无法直观看到分析历史趋势、观察类型分布和置信度变化等关键信息。引入 ECharts 可视化图表并重新设计看板布局，将使数据呈现更丰富、页面更具吸引力，同时提供实际的分析洞察价值。

## What Changes

- 新增 `echarts` + `echarts-for-react` 依赖，提供声明式 React 图表组件
- 新增 **分析趋势面积图**：展示近 30 天分析运行频率和每次合并的观察数趋势
- 新增 **观察类型分布环形图**：展示 preference / pattern / development-process 等类型的占比
- 新增 **置信度仪表盘**：用半圆仪表盘直观展示系统整体置信度分数
- 新增后端 API `/api/stats/overview`：聚合观察类型分布和历史趋势数据
- 重新设计看板布局：从当前的 "指标卡片 + 快捷操作" 升级为 "核心指标 + 图表区 + 操作区" 三段式布局
- 所有图表适配暗色主题，与现有 slate/amber/cyan 配色统一

## Capabilities

### New Capabilities
- `dashboard-charts`: ECharts 图表组件集（趋势图、分布图、仪表盘），包括数据获取、主题适配和响应式尺寸

### Modified Capabilities
- `evolution-dashboard`: 看板页面布局重构，从指标卡片网格升级为图表驱动的三段式布局

## Impact

- **前端依赖**: 新增 `echarts` (~1MB gzipped ~300KB) 和 `echarts-for-react` (~5KB)
- **后端 API**: 新增 `/api/stats/overview` 端点，查询 SQLite 聚合数据
- **受影响文件**: `Dashboard.tsx` 布局重构，新增 3 个图表组件文件
- **构建大小**: 首次引入 echarts 会增加约 300KB gzipped 体积，可通过按需引入优化
- **无破坏性变更**: 不修改现有 API 和数据模型
