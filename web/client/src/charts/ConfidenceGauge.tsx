import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from './theme';

interface Props {
  value: number; // 0-1 range
  loading?: boolean;
}

export default function ConfidenceGauge({ value, loading }: Props) {
  const percentage = Math.round(value * 100);

  const option = useMemo(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100%',
        center: ['50%', '75%'],
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 16,
            color: [
              [0.4, '#ef4444'],
              [0.7, '#eab308'],
              [1, '#22c55e'],
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '55%',
          width: 8,
          offsetCenter: [0, '-10%'],
          itemStyle: { color: CHART_COLORS.slate300 },
        },
        axisTick: {
          length: 6,
          lineStyle: { color: CHART_COLORS.slate600, width: 1 },
        },
        splitLine: {
          length: 12,
          lineStyle: { color: CHART_COLORS.slate600, width: 2 },
        },
        axisLabel: {
          distance: 20,
          color: CHART_COLORS.slate500,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          formatter: (v: number) => {
            if (v === 0 || v === 50 || v === 100) return `${v}`;
            return '';
          },
        },
        title: {
          offsetCenter: [0, '20%'],
          fontSize: 11,
          color: CHART_COLORS.slate500,
          fontFamily: 'JetBrains Mono, monospace',
        },
        detail: {
          fontSize: 28,
          offsetCenter: [0, '-5%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: CHART_COLORS.slate300,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 900,
        },
        data: [{ value: percentage, name: '置信度' }],
      },
    ],
  }), [percentage]);

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: '160px', width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
