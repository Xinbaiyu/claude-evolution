## Context

当前 Dashboard 页面使用纯 CSS 进度条和数字卡片展示系统状态。布局为两栏结构：左侧主内容区（指标网格 + 快捷操作 + 系统信息），右侧侧边栏（近期分析记录）。所有可视化均为 Tailwind CSS 手写实现，无图表库依赖。

数据来源已具备：`/api/status` 提供观察数量和置信度，`/api/analysis-logs` 提供分析历史记录。缺少的是按类型聚合的统计数据和时间序列趋势。

## Goals / Non-Goals

**Goals:**
- 引入 ECharts 图表库，在看板上增加 3 个有意义的数据可视化图表
- 重新设计看板布局，形成更有层次感的信息展示
- 新增后端聚合 API 提供图表所需的统计数据
- 保持暗色主题一致性，图表配色融入现有 slate/amber/cyan 体系

**Non-Goals:**
- 不做图表的交互式下钻（drill-down）功能
- 不实现图表数据的实时 WebSocket 推送（刷新或轮询即可）
- 不修改现有 API 的返回格式
- 不做移动端自适应（现有项目无移动端需求）

## Decisions

### Decision 1: 使用 echarts-for-react 而非裸 echarts

**选择**: `echarts-for-react` 声明式 React wrapper

**替代方案**:
- 裸 echarts：需手动管理 DOM ref、resize、dispose 生命周期
- recharts：API 更 React-native，但自定义主题能力弱，暗色主题适配困难
- chart.js：轻量但图表类型少，缺少仪表盘和高级动效

**理由**: echarts-for-react 将 echarts 实例封装为 `<ReactECharts option={...} />` 组件，自动处理 resize 和 dispose。项目需要暗色主题深度定制和丰富图表类型（面积图、环形图、仪表盘），echarts 的 theme 和 option 系统最为成熟。

### Decision 2: 三个图表的选型

| 图表 | 类型 | 数据来源 | 价值 |
|------|------|---------|------|
| 分析趋势图 | area (面积图) | `/api/analysis-logs` 历史数据 | 展示分析活跃度和合并观察数的时间趋势 |
| 观察类型分布 | pie/ring (环形图) | 新增 `/api/stats/overview` | 展示 preference/pattern/development-process 等类型占比 |
| 置信度仪表盘 | gauge (仪表盘) | `/api/status` avgConfidence | 直观展示系统整体置信度水平 |

**替代方案**: 考虑过 radar 雷达图展示多维健康度，但目前维度不够多（仅 3-4 个指标），不如 gauge 直观。考虑过 heatmap 热力图，但分析频率还不够高，热力图会显得空旷。

### Decision 3: 后端 API 设计 — 单一聚合端点

**选择**: 新增 `GET /api/stats/overview` 单一端点返回所有图表所需数据

```typescript
interface StatsOverview {
  typeDistribution: Array<{ type: string; count: number }>
  analysisTrend: Array<{ date: string; runCount: number; mergedCount: number }>
  trendDays: number
}
```

**替代方案**: 每个图表一个端点（`/api/stats/type-distribution`, `/api/stats/trend`）。但图表数量少，拆分端点会增加不必要的前端请求和后端路由，单一端点一次请求获取所有数据更高效。

**理由**: 观察类型分布直接查 SQLite `observations` 表 GROUP BY type；分析趋势从 `analysis_runs` 表按日期聚合。两个查询轻量，合并为一个 API 响应合理。

### Decision 4: 看板布局重构方案

**新布局**:
```
┌─────────────────────────────────────────────┐
│              HEADER (Navigation)            │
├─────────────────────────────────────────────┤
│  核心指标行 (4 cards，保留现有)               │
├────────────────────────┬────────────────────┤
│                        │                    │
│  分析趋势面积图         │  观察类型环形图     │
│  (col-span-2)          │  + 置信度仪表盘    │
│                        │                    │
├────────────────────────┴────────────────────┤
│  快捷操作 + 近期分析记录 (合并为底部区域)      │
└─────────────────────────────────────────────┘
```

**变更**:
- 将右侧侧边栏的 RecentAnalysisWidget 移到底部，与快捷操作并排
- 中间主区域用于图表展示，左大右小两栏
- 核心指标卡片保留但简化样式

### Decision 5: ECharts 暗色主题配置

创建自定义 ECharts 主题 `evolution-dark`，复用项目现有配色：
- 背景: transparent（继承容器 slate-900 背景）
- 文本: slate-300
- 轴线: slate-600
- 面积图渐变: amber-500 → transparent
- 环形图调色盘: amber-400, cyan-400, emerald-400, purple-400, rose-400
- 仪表盘: amber 到 emerald 的渐变色带

## Risks / Trade-offs

- **[包体积增加]** → echarts 完整包约 1MB，gzipped ~300KB。Mitigation: 使用 echarts 按需引入（`echarts/core` + 需要的组件），可压缩到 ~150KB gzipped
- **[初始加载性能]** → 图表数据需要额外 API 请求。Mitigation: 图表区域显示 skeleton loading，不阻塞核心指标渲染
- **[数据量不足时图表空旷]** → 新安装的系统分析历史少。Mitigation: 当数据不足时显示空状态提示 "运行更多分析以查看趋势"
- **[SQLite 聚合查询性能]** → 大量 observations 时 GROUP BY 可能变慢。Mitigation: 当前数据规模极小（百级），无需担心；未来可加索引
