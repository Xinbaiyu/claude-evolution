import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './theme';

interface TypeDistributionData {
  type: string;
  count: number;
}

interface Props {
  data: TypeDistributionData[];
  loading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  preference: '偏好',
  pattern: '模式',
  'development-process': '开发流程',
  workflow: '工作流',
};

const PALETTE = [
  CHART_COLORS.amber400,
  CHART_COLORS.cyan400,
  CHART_COLORS.emerald400,
  CHART_COLORS.purple400,
  CHART_COLORS.rose400,
];

export default function TypeDistributionChart({ data, loading }: Props) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: CHART_COLORS.slate800,
      borderColor: CHART_COLORS.slate700,
      textStyle: { color: CHART_COLORS.slate300, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
      formatter: (params: any) => {
        const label = TYPE_LABELS[params.name] || params.name;
        return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};margin-right:6px"></span>${label}: <b>${params.value}</b> (${params.percent}%)`;
      },
    },
    series: [
      // 外圈装饰环
      {
        type: 'pie',
        radius: ['82%', '85%'],
        center: ['50%', '42%'],
        silent: true,
        label: { show: false },
        data: [{ value: 1, itemStyle: { color: CHART_COLORS.slate700 } }],
      },
      // 主环形图
      {
        type: 'pie',
        radius: ['45%', '78%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: CHART_COLORS.slate900,
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        // 中心文字：总数
        emphasis: {
          label: {
            show: true,
            position: 'center',
            formatter: (params: any) => {
              const label = TYPE_LABELS[params.name] || params.name;
              return `{name|${label}}\n{val|${params.value}}`;
            },
            rich: {
              name: {
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                color: CHART_COLORS.slate400,
                lineHeight: 20,
              },
              val: {
                fontSize: 22,
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#f8fafc',
                lineHeight: 30,
              },
            },
          },
          itemStyle: {
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.4)',
          },
        },
        // 默认中心显示总数
        markPoint: {},
        data: data.map((d, i) => ({
          value: d.count,
          name: d.type,
          itemStyle: { color: PALETTE[i % PALETTE.length] },
        })),
      },
      // 中心静态文字（通过透明 pie 实现）
      {
        type: 'pie',
        radius: [0, 0],
        center: ['50%', '42%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: `{total|${total}}\n{label|总数}`,
          rich: {
            total: {
              fontSize: 26,
              fontWeight: 'bold',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#f8fafc',
              lineHeight: 34,
            },
            label: {
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: CHART_COLORS.slate500,
              lineHeight: 18,
            },
          },
        },
        data: [{ value: 0 }],
      },
    ],
    // 底部图例
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: {
        color: CHART_COLORS.slate400,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      formatter: (name: string) => TYPE_LABELS[name] || name,
    },
  }), [data, total]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-3 w-full px-4">
          <div className="w-24 h-24 rounded-full bg-slate-800 animate-pulse mx-auto" />
          <div className="h-3 bg-slate-800 rounded animate-pulse w-2/3 mx-auto" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-600 font-mono text-sm text-center">
          <div className="text-2xl mb-2 opacity-40">&#x25EF;</div>
          暂无类型数据
        </div>
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
