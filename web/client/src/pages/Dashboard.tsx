import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client';
import type { SystemStatus } from '../api/client';
import { wsClient } from '../api/websocket';
import { toast } from '../components/Toast';
import { ManualAnalysisTrigger } from '../components/ManualAnalysisTrigger';
import RecentAnalysisWidget from '../components/RecentAnalysisWidget';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();

    // WebSocket 事件监听
    const unsubscribeAnalysis = wsClient.on('analysis_complete', () => {
      toast.success('分析完成，数据已刷新');
      fetchStatus();
    });

    // New observation events
    const unsubscribePromoted = wsClient.on('observation_promoted', () => {
      fetchStatus();
    });

    const unsubscribeDemoted = wsClient.on('observation_demoted', () => {
      fetchStatus();
    });

    const unsubscribeArchived = wsClient.on('observation_archived', () => {
      fetchStatus();
    });

    // 清理
    return () => {
      unsubscribeAnalysis();
      unsubscribePromoted();
      unsubscribeDemoted();
      unsubscribeArchived();
    };
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStatus();
      setStatus(data);
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : '加载系统状态失败';
      console.error('Failed to fetch status:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-amber-500 text-xl font-mono">加载系统数据中</div>
          <div className="mt-4 flex gap-2 justify-center">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500 text-xl font-mono">系统错误：无法加载数据</div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
        {/* Left: Main Content */}
        <div className="flex-1 min-w-0">
        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Active Observations - Largest */}
          <div
            className="col-span-2 border-4 border-amber-500 bg-slate-900 p-6 relative overflow-hidden group hover:border-amber-400 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out' }}
          >
            <div className="absolute top-0 right-0 text-[120px] font-black text-amber-500/5 leading-none">
              {status.observations.active}
            </div>
            <div className="relative z-10">
              <div className="text-xs text-amber-500 font-mono font-bold tracking-widest">候选池</div>
              <div className="text-6xl font-black mt-2 text-amber-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {status.observations.active}
              </div>
              <div className="text-sm text-slate-400 font-mono mt-2">
                等待审核的观察
              </div>
            </div>
          </div>

          {/* Context Observations */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-cyan-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.1s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">上下文池</div>
            <div className="text-5xl font-black mt-2 text-cyan-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.observations.context}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              已应用 {status.observations.context} 条
            </div>
          </div>

          {/* Confidence Score */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-green-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.2s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">置信度</div>
            <div className="text-5xl font-black mt-2 text-green-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {Math.round(status.metrics.avgConfidence * 100)}
              <span className="text-2xl text-slate-600">%</span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              平均分数
            </div>
          </div>

          {/* Total Observations */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-purple-500 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out 0.15s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">总观察数</div>
            <div className="text-5xl font-black mt-2 text-purple-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.observations.total}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              全部观察
            </div>
          </div>

          {/* Pool Distribution */}
          <div
            className="col-span-3 border-4 border-slate-700 bg-slate-900 p-6 hover:border-slate-500 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out 0.25s backwards' }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">观察池分布</div>
                <div className="text-4xl font-black mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {status.observations.total}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 ml-8">
                <div className="h-2 bg-slate-800 relative overflow-hidden">
                  <div
                    className="absolute h-full bg-amber-500"
                    style={{
                      width: `${(status.observations.active / (status.observations.total || 1)) * 100}%`,
                      transition: 'width 1s ease-out'
                    }}
                  ></div>
                  <div
                    className="absolute h-full bg-cyan-500"
                    style={{
                      left: `${(status.observations.active / (status.observations.total || 1)) * 100}%`,
                      width: `${(status.observations.context / (status.observations.total || 1)) * 100}%`,
                      transition: 'width 1s ease-out, left 1s ease-out'
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-500 mt-2">
                  <span>{Math.round((status.observations.active / (status.observations.total || 1)) * 100)}% 候选池</span>
                  <span>{Math.round((status.observations.context / (status.observations.total || 1)) * 100)}% 上下文池</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="border-4 border-slate-700 bg-slate-900 p-6 mb-8"
          style={{ animation: 'fadeIn 0.6s ease-out 0.3s backwards' }}
        >
          <h2 className="text-lg font-black text-amber-500 mb-4 tracking-tight" style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}>
            快捷操作
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/learning-review')}
              className="border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-4 px-6 transition-colors text-left group"
            >
              <div className="text-2xl mb-1">→</div>
              <div className="text-sm">审核观察</div>
              <div className="text-xs text-slate-400 mt-1">{status.observations.active} 条待审核</div>
            </button>

            <button
              onClick={() => navigate('/source-manager')}
              className="border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-mono font-bold py-4 px-6 transition-colors text-left group"
            >
              <div className="text-2xl mb-1">✏</div>
              <div className="text-sm">配置编辑器</div>
              <div className="text-xs text-slate-400 mt-1">编辑源文件</div>
            </button>

            <ManualAnalysisTrigger />

            <button
              onClick={() => navigate('/settings')}
              className="border-2 border-slate-600 hover:border-slate-400 hover:bg-slate-400/10 text-slate-300 hover:text-slate-100 font-mono font-bold py-4 px-6 transition-colors text-left"
            >
              <div className="text-2xl mb-1">⚙</div>
              <div className="text-sm">系统设置</div>
              <div className="text-xs text-slate-400 mt-1">配置参数</div>
            </button>
          </div>
        </div>

        {/* System Info Footer */}
        <div className="border-t-2 border-slate-800 pt-4 text-center">
          <div className="text-xs font-mono text-slate-600">
            CLAUDE-EVOLUTION v{status.server.version} | 系统正常运行 | {formatUptime(status.server.uptime)} 运行时长
          </div>
        </div>
        </div>

        {/* Right: Recent Analysis Sidebar */}
        <div className="w-72 flex-shrink-0" style={{ animation: 'fadeIn 0.6s ease-out 0.35s backwards' }}>
          <div className="sticky top-24">
            <RecentAnalysisWidget maxItems={8} />
          </div>
        </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;700&display=swap');

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
