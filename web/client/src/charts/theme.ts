/**
 * ECharts 暗色主题配置
 * 与项目 slate/amber/cyan 配色体系统一
 */

export const CHART_COLORS = {
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  cyan400: '#22d3ee',
  cyan500: '#06b6d4',
  emerald400: '#34d399',
  emerald500: '#10b981',
  purple400: '#c084fc',
  rose400: '#fb7185',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  red400: '#f87171',
  yellow400: '#facc15',
  green400: '#4ade80',
} as const;

export const COLOR_PALETTE = [
  CHART_COLORS.amber400,
  CHART_COLORS.cyan400,
  CHART_COLORS.emerald400,
  CHART_COLORS.purple400,
  CHART_COLORS.rose400,
];

export const evolutionDarkTheme = {
  color: COLOR_PALETTE,
  backgroundColor: 'transparent',
  textStyle: {
    color: CHART_COLORS.slate300,
    fontFamily: 'JetBrains Mono, monospace',
  },
  title: {
    textStyle: {
      color: CHART_COLORS.slate300,
      fontFamily: 'JetBrains Mono, monospace',
    },
    subtextStyle: {
      color: CHART_COLORS.slate500,
    },
  },
  legend: {
    textStyle: {
      color: CHART_COLORS.slate400,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
    },
  },
  tooltip: {
    backgroundColor: CHART_COLORS.slate800,
    borderColor: CHART_COLORS.slate700,
    textStyle: {
      color: CHART_COLORS.slate300,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
    },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: CHART_COLORS.slate600 } },
    axisTick: { lineStyle: { color: CHART_COLORS.slate600 } },
    axisLabel: { color: CHART_COLORS.slate500, fontSize: 11 },
    splitLine: { lineStyle: { color: CHART_COLORS.slate800 } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: CHART_COLORS.slate600 } },
    axisTick: { lineStyle: { color: CHART_COLORS.slate600 } },
    axisLabel: { color: CHART_COLORS.slate500, fontSize: 11 },
    splitLine: { lineStyle: { color: CHART_COLORS.slate800, type: 'dashed' as const } },
  },
};
