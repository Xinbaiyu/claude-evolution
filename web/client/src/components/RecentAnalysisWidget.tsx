import { useEffect, useState, useRef } from 'react';
import { apiClient, type AnalysisRun } from '../api/client';
import { wsClient } from '../api/websocket';

interface Props {
  maxItems?: number;
}

export default function RecentAnalysisWidget({ maxItems = 20 }: Props) {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const firstHalfRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    const inner = innerRef.current;
    const firstHalf = firstHalfRef.current;
    if (!inner || !firstHalf || runs.length === 0) return;

    // 第一条正在分析中时，停止滚动让用户看到进度
    const isFirstRunning = runs[0].status === 'running';
    if (isFirstRunning) {
      offsetRef.current = 0;
      inner.style.transform = 'translateY(0px)';
      return;
    }

    const timer = setTimeout(() => {
      // 第一份内容的高度 + 间距 = 循环周期
      const firstHalfRect = firstHalf.getBoundingClientRect();
      const secondHalf = firstHalf.nextElementSibling as HTMLElement | null;
      const secondHalfRect = secondHalf?.getBoundingClientRect();
      const singleHeight = secondHalfRect
        ? secondHalfRect.top - firstHalfRect.top
        : firstHalf.offsetHeight;

      if (singleHeight <= 0) return;

      // 使用 will-change 提升为合成层，避免 repaint 闪烁
      inner.style.willChange = 'transform';

      const animate = () => {
        if (!isPausedRef.current) {
          offsetRef.current += 0.4;

          // 取模运算保证永远在 [0, singleHeight) 范围内
          // 避免先赋大值再减的中间状态
          offsetRef.current = offsetRef.current % singleHeight;
        }
        inner.style.transform = `translateY(-${offsetRef.current}px)`;
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [runs]);

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

    // 订阅 WebSocket 事件，自动刷新列表
    const unsubStarted = wsClient.on('analysis_started', () => {
      setTimeout(loadRecentRuns, 500);
    });
    const unsubComplete = wsClient.on('analysis_complete', () => {
      loadRecentRuns();
    });
    const unsubFailed = wsClient.on('analysis_failed', () => {
      loadRecentRuns();
    });

    // 监听手动触发分析事件，立即刷新
    const onTriggered = () => {
      // 延迟一小段让后端写入记录
      setTimeout(loadRecentRuns, 500);
    };
    window.addEventListener('analysis_triggered', onTriggered);

    return () => {
      unsubStarted();
      unsubComplete();
      unsubFailed();
      window.removeEventListener('analysis_triggered', onTriggered);
    };
  }, [maxItems]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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

  const renderRunItem = (run: AnalysisRun, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${run.id}`}
      className="flex items-start gap-2 p-2 bg-slate-800 border-l-2 border-slate-700 hover:border-amber-500 transition-colors cursor-pointer"
      onClick={() => window.location.href = '/analysis-logs'}
    >
      <div className="text-base flex-shrink-0">{getStatusIcon(run.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-slate-300 font-mono font-bold">
            {formatTime(run.startTime)}
          </span>
          {run.duration && (
            <span className="text-xs text-slate-600 font-mono">
              {formatDuration(run.duration)}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 font-mono truncate">
          {getStatusText(run)}
        </div>
      </div>
    </div>
  );

  if (loading && runs.length === 0) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-black text-amber-500 font-mono tracking-tight mb-4">最近分析记录</h3>
        <div className="text-slate-500 text-center py-8 font-mono text-sm">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-black text-amber-500 font-mono tracking-tight mb-4">最近分析记录</h3>
        <div className="text-red-400 text-center py-8 font-mono text-sm">{error}</div>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 p-4">
        <h3 className="text-lg font-black text-amber-500 font-mono tracking-tight mb-4">最近分析记录</h3>
        <div className="text-slate-500 text-center py-8 font-mono text-sm">暂无分析记录</div>
      </div>
    );
  }

  return (
    <div className="border-4 border-slate-700 bg-slate-900 p-4">
      <h3 className="text-lg font-black text-amber-500 font-mono tracking-tight mb-4">最近分析记录</h3>

      <div
        className="max-h-48 overflow-hidden"
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
      >
        <div ref={innerRef}>
          {/* 第一份：用于测量高度和无缝循环 */}
          <div ref={firstHalfRef} className="space-y-2">
            {runs.map((run) => renderRunItem(run, 'a'))}
          </div>
          {/* 第二份：紧跟在后面，实现无缝衔接 */}
          <div className="space-y-2 mt-2">
            {runs.map((run) => renderRunItem(run, 'b'))}
          </div>
        </div>
      </div>

      <button
        onClick={() => window.location.href = '/analysis-logs'}
        className="mt-3 w-full text-xs text-amber-500 hover:text-amber-400 border-2 border-amber-500/30 hover:border-amber-500/60 transition-colors text-center py-2 font-mono font-bold"
      >
        查看全部日志 →
      </button>
    </div>
  );
}
