import { useEffect, useState } from 'react';
import { apiClient, type AnalysisRun } from '../api/client';
import { wsClient } from '../api/websocket';

interface Props {
  maxItems?: number;
}

export default function RecentAnalysisWidget({ maxItems = 5 }: Props) {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getAnalysisLogs({ limit: maxItems });
      setRuns(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentRuns();

    // 订阅 analysis_complete 事件，自动刷新列表
    const unsubscribe = wsClient.on('analysis_complete', () => {
      loadRecentRuns();
    });

    return unsubscribe;
  }, [maxItems]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
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

  const getStatusText = (run: AnalysisRun) => {
    if (run.status === 'success') {
      return run.stats
        ? `合并${run.stats.merged}条观察`
        : '分析成功';
    }
    if (run.status === 'failed') {
      return run.error?.message || '分析失败';
    }
    return '分析中...';
  };

  if (loading && runs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">最近分析记录</h3>
        <div className="text-gray-400 text-center py-8">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">最近分析记录</h3>
        <div className="text-red-400 text-center py-8">{error}</div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">最近分析记录</h3>
        <div className="text-gray-400 text-center py-8">暂无分析记录</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">最近分析记录</h3>

      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => window.location.href = '/analysis-logs'}
          >
            <div className="text-xl flex-shrink-0">{getStatusIcon(run.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-300 font-medium">
                  {formatTime(run.startTime)}
                </span>
                {run.duration && (
                  <span className="text-xs text-gray-500">
                    ({formatDuration(run.duration)})
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400 truncate">
                {getStatusText(run)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.location.href = '/analysis-logs'}
        className="mt-4 w-full text-sm text-blue-400 hover:text-blue-300 transition-colors text-center py-2"
      >
        查看全部日志 →
      </button>
    </div>
  );
}
