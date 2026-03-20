import { useState } from 'react';
import type { AnalysisRun } from '../api/client';

interface Props {
  run: AnalysisRun;
}

export default function AnalysisRunCard({ run }: Props) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '计算中...';
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  const getStatusIcon = (status: AnalysisRun['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '🔴';
      case 'running':
        return '⏳';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: AnalysisRun['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStepStatusIcon = (status: 'success' | 'failed' | 'skipped') => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⚪';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl">{getStatusIcon(run.status)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`font-semibold ${getStatusColor(run.status)}`}>
                  {run.status === 'success' && '分析成功'}
                  {run.status === 'failed' && '分析失败'}
                  {run.status === 'running' && '分析中...'}
                </span>
                <span className="text-sm text-gray-400">
                  {formatTime(run.startTime)}
                </span>
              </div>
              {run.duration !== undefined && (
                <div className="text-sm text-gray-500">
                  持续时间: {formatDuration(run.duration)}
                </div>
              )}
            </div>
          </div>
          <div className="text-gray-400">
            {expanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          {/* Steps */}
          {run.steps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">执行步骤</h4>
              <div className="space-y-2">
                {run.steps.map((step) => (
                  <div
                    key={step.step}
                    className="bg-gray-700/50 rounded p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getStepStatusIcon(step.status)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-500">
                            [{step.step}/8]
                          </span>
                          <span className="text-sm font-medium text-gray-200">
                            {step.name}
                          </span>
                          {step.duration !== undefined && (
                            <span className="text-xs text-gray-500">
                              ({step.duration}s)
                            </span>
                          )}
                        </div>
                        {step.output && (
                          <div className="text-xs text-gray-400 mt-1">
                            {step.output}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-xs text-red-400 mt-1 font-mono">
                            错误: {step.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          {run.stats && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">统计数据</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-700/50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">合并</div>
                  <div className="text-lg font-bold text-blue-400">
                    {run.stats.merged}
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">晋升</div>
                  <div className="text-lg font-bold text-green-400">
                    {run.stats.promoted}
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">归档</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {run.stats.archived}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {run.error && (
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-3">错误详情</h4>
              <div className="bg-red-900/20 border border-red-800 rounded p-3">
                <div className="text-sm text-red-300 mb-2">
                  {run.error.message}
                </div>
                {run.error.stack && (
                  <details className="text-xs text-red-400 font-mono">
                    <summary className="cursor-pointer hover:text-red-300">
                      查看堆栈跟踪
                    </summary>
                    <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto">
                      {run.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
