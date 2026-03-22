import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './theme';

interface Props {
  value: number; // 0-1 range
  loading?: boolean;
}

export default function ConfidenceGauge({ value, loading }: Props) {
  const percentage = Math.round(value * 100);

  // 根据值选择颜色：红(<40) / 黄(40-70) / 绿(>70)
  const gaugeColor = percentage < 40
    ? CHART_COLORS.red400
    : percentage < 70
      ? CHART_COLORS.yellow400
      : CHART_COLORS.emerald400;

  const gaugeAccent = percentage < 40
    ? '#dc2626'
    : percentage < 70
      ? '#ca8a04'
      : '#059669';

  const option = useMemo(() => ({
    series: [
      // 外层：主进度环 + 刻度
      {
        type: 'gauge',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: gaugeColor,
        },
        progress: {
          show: true,
          width: 12,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, CHART_COLORS.slate700]],
          },
        },
        axisTick: {
          distance: -22,
          splitNumber: 5,
          lineStyle: {
            width: 1,
            color: CHART_COLORS.slate500,
          },
        },
        splitLine: {
          distance: -26,
          length: 8,
          lineStyle: {
            width: 2,
            color: CHART_COLORS.slate500,
          },
        },
        axisLabel: {
          distance: -10,
          color: CHART_COLORS.slate500,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (v: number) => {
            if (v === 0 || v === 50 || v === 100) return `${v}`;
            return '';
          },
        },
        anchor: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 24,
          borderRadius: 6,
          offsetCenter: [0, '-15%'],
          fontSize: 26,
          fontWeight: 'bolder',
          fontFamily: 'JetBrains Mono, monospace',
          formatter: '{value}%',
          color: 'inherit',
        },
        data: [{ value: percentage }],
      },
      // 内层：细进度条
      {
        type: 'gauge',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        itemStyle: {
          color: gaugeAccent,
        },
        progress: {
          show: true,
          width: 3,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        data: [{ value: percentage }],
      },
    ],
  }), [percentage, gaugeColor, gaugeAccent]);

  if (loading) {
    return (
      <div className="h-[140px] flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: '140px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
