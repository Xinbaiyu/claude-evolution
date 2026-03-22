## 1. 依赖安装与主题配置

- [x] 1.1 安装 `echarts` 和 `echarts-for-react` 到 web/client
- [x] 1.2 创建 ECharts 暗色主题配置文件 `web/client/src/charts/theme.ts`，定义 `evolution-dark` 主题

## 2. 后端统计 API

- [x] 2.1 在 `web/server/routes/` 新增 stats 路由，实现 `GET /api/stats/overview` 端点
- [x] 2.2 查询 SQLite 聚合观察类型分布（GROUP BY type）和分析趋势（按日期聚合近 30 天）

## 3. 前端 API Client

- [x] 3.1 在 `web/client/src/api/client.ts` 添加 `getStatsOverview()` 方法和 `StatsOverview` 类型定义

## 4. 图表组件实现

- [x] 4.1 创建 `AnalysisTrendChart` 组件：双 Y 轴面积图，展示每日运行次数和合并观察数
- [x] 4.2 创建 `TypeDistributionChart` 组件：环形图，展示观察类型占比，中心显示总数
- [x] 4.3 创建 `ConfidenceGauge` 组件：半圆仪表盘，展示置信度百分比（红黄绿色带）
- [x] 4.4 为所有图表添加 loading skeleton 和空数据状态处理

## 5. Dashboard 布局重构

- [x] 5.1 修改 `Dashboard.tsx` 布局：去掉右侧边栏，改为单栏三段式（指标行 → 图表区 → 操作区）
- [x] 5.2 将 RecentAnalysisWidget 从侧边栏移到底部操作区域，与快捷操作并排
- [x] 5.3 在指标行下方集成图表组件：左侧趋势图(2/3宽) + 右侧分布图和仪表盘(1/3宽)
- [x] 5.4 添加 `getStatsOverview` 数据获取逻辑和 loading/error 状态处理

## 6. 验证

- [x] 6.1 构建验证：`npm run build` 无错误
- [x] 6.2 视觉验证：在浏览器中确认图表渲染正确、暗色主题一致、布局合理
