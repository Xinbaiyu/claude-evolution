import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { wsClient } from '../api/websocket';
import { toast } from './Toast';

export function ManualAnalysisTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 页面加载时查询后端分析状态，恢复 loading
  useEffect(() => {
    const restoreAnalysisState = async () => {
      const status = await apiClient.getAnalysisStatus();
      if (status.isRunning && status.startTime) {
        const backendStartTime = new Date(status.startTime).getTime();
        setIsRunning(true);
        setStartTime(backendStartTime);
        setElapsedTime(Date.now() - backendStartTime);
      }
    };
    restoreAnalysisState();
  }, []);

  // 计时器
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, startTime]);

  // 监听 WebSocket 完成/失败事件
  useEffect(() => {
    // 分析成功
    const unsubscribeSuccess = wsClient.on('analysis_complete', (data: any) => {
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);

      // Support both legacy (suggestionsCount) and new (observationsCount) format
      const count = data?.observationsCount ?? data?.suggestionsCount ?? 0;
      toast.success(`✅ 分析完成，发现 ${count} 条新观察`);
    });

    // 分析失败
    const unsubscribeFailed = wsClient.on('analysis_failed', (data: any) => {
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);

      const errorMsg = data?.error || '分析失败';
      toast.error(`❌ 分析失败: ${errorMsg}`);
    });

    return () => {
      unsubscribeSuccess();
      unsubscribeFailed();
    };
  }, []);

  const handleTriggerAnalysis = async () => {
    try {
      setIsRunning(true);
      setStartTime(Date.now());
      setElapsedTime(0);

      await apiClient.triggerAnalysis();
      toast.info('分析已启动');

      // 通知其他组件（如 RecentAnalysisWidget）刷新数据
      window.dispatchEvent(new CustomEvent('analysis_triggered'));
    } catch (error: any) {
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);

      if (error?.statusCode === 409) {
        // 409 表示后台已在分析，恢复 loading 状态
        const status = await apiClient.getAnalysisStatus();
        if (status.isRunning && status.startTime) {
          const backendStartTime = new Date(status.startTime).getTime();
          setIsRunning(true);
          setStartTime(backendStartTime);
          setElapsedTime(Date.now() - backendStartTime);
        }
        toast.warning('分析正在进行中，请稍候');
      } else {
        toast.error(error?.message || '分析启动失败');
      }
    }
  };

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleTriggerAnalysis}
        disabled={isRunning}
        className={`
          w-full border-2 font-mono font-bold py-3 px-4 transition-all text-left
          ${
            isRunning
              ? 'border-amber-500 bg-amber-500/10 text-amber-500 cursor-not-allowed'
              : 'border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-500'
          }
        `}
      >
        <div className="text-2xl mb-1">
          {isRunning ? (
            <span className="inline-block animate-spin">⟳</span>
          ) : (
            '↻'
          )}
        </div>
        <div className="text-sm">
          {isRunning ? '分析中...' : '运行分析'}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {isRunning ? formatElapsedTime(elapsedTime) : '手动触发'}
        </div>
      </button>

      {isRunning && (
        <div className="border-2 border-amber-500/30 bg-amber-500/5 p-3 font-mono text-xs text-amber-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span>正在分析代码库... {formatElapsedTime(elapsedTime)}</span>
          </div>
          <div className="mt-2 h-1 bg-amber-500/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 animate-pulse"
              style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
