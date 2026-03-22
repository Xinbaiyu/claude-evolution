import ReactECharts from 'echarts-for-react';
import { CHART_COLORS, evolutionDarkTheme } from './theme';

interface TrendData {
  date: string;
  runCount: number;
  mergedCount: number;
}

interface Props {
  data: TrendData[];
  loading?: boolean;
}

export default function AnalysisTrendChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex-1 min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-slate-500 font-mono text-sm">
          加载趋势数据...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 min-h-[200px] flex items-center justify-center">
        <div className="text-slate-600 font-mono text-sm text-center">
          <div className="text-3xl mb-2 opacity-30">📈</div>
          运行更多分析以查看趋势
        </div>
      </div>
    );
  }

  const option = {
    ...evolutionDarkTheme,
    grid: {
      top: 50,
      right: 60,
      bottom: 10,
      left: 50,
      containLabel: false,
    },
    tooltip: {
      ...evolutionDarkTheme.tooltip,
      trigger: 'axis' as const,
      axisPointer: {
        type: 'cross' as const,
        lineStyle: { color: CHART_COLORS.slate600, type: 'dashed' as const },
      },
    },
    legend: {
      ...evolutionDarkTheme.legend,
      data: ['运行次数', '合并观察'],
      top: 0,
      right: 0,
    },
    xAxis: {
      type: 'category' as const,
      data: data.map((d) => d.date.slice(5)), // MM-DD
      ...evolutionDarkTheme.categoryAxis,
      boundaryGap: false,
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '运行次数',
        nameTextStyle: { color: CHART_COLORS.slate500, fontSize: 10 },
        ...evolutionDarkTheme.valueAxis,
        minInterval: 1,
      },
      {
        type: 'value' as const,
        name: '合并观察',
        nameTextStyle: { color: CHART_COLORS.slate500, fontSize: 10 },
        ...evolutionDarkTheme.valueAxis,
        minInterval: 1,
      },
    ],
    series: [
      {
        name: '运行次数',
        type: 'line',
        yAxisIndex: 0,
        data: data.map((d) => d.runCount),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: CHART_COLORS.amber400, width: 2 },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${CHART_COLORS.amber400}40` },
              { offset: 1, color: `${CHART_COLORS.amber400}05` },
            ],
          },
        },
        itemStyle: { color: CHART_COLORS.amber400 },
      },
      {
        name: '合并观察',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.mergedCount),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: CHART_COLORS.cyan400, width: 2 },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${CHART_COLORS.cyan400}40` },
              { offset: 1, color: `${CHART_COLORS.cyan400}05` },
            ],
          },
        },
        itemStyle: { color: CHART_COLORS.cyan400 },
      },
    ],
  };

  return (
    <div className="flex-1 min-h-[200px]">
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
