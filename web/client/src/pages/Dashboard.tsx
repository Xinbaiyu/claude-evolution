import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client';
import type { SystemStatus, StatsOverview } from '../api/client';
import { wsClient } from '../api/websocket';
import { toast } from '../components/Toast';
import { ManualAnalysisTrigger } from '../components/ManualAnalysisTrigger';
import RecentAnalysisWidget from '../components/RecentAnalysisWidget';
import AnalysisTrendChart from '../charts/AnalysisTrendChart';
import TypeDistributionChart from '../charts/TypeDistributionChart';
import ConfidenceGauge from '../charts/ConfidenceGauge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchStats();

    const unsubscribeAnalysis = wsClient.on('analysis_complete', () => {
      toast.success('分析完成，数据已刷新');
      fetchStatus();
      fetchStats();
    });

    const unsubscribePromoted = wsClient.on('observation_promoted', () => {
      fetchStatus();
      fetchStats();
    });

    const unsubscribeDemoted = wsClient.on('observation_demoted', () => {
      fetchStatus();
      fetchStats();
    });

    const unsubscribeArchived = wsClient.on('observation_archived', () => {
      fetchStatus();
      fetchStats();
    });

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
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const data = await apiClient.getStatsOverview();
      setStats(data);
    } catch {
      setStats({ typeDistribution: [], analysisTrend: [], trendDays: 30 });
    } finally {
      setStatsLoading(false);
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* === Section 1: Metrics Row === */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Active Observations - Largest */}
          <div
            className="col-span-2 border-4 border-amber-500 bg-slate-900 p-4 relative overflow-hidden group hover:border-amber-400 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out' }}
          >
            <div className="absolute top-0 right-0 text-[120px] font-black text-amber-500/5 leading-none">
              {status.observations.active}
            </div>
            <div className="relative z-10">
              <div className="text-xs text-amber-500 font-mono font-bold tracking-widest">候选池</div>
              <div className="text-5xl font-black mt-1 text-amber-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {status.observations.active}
              </div>
              <div className="text-sm text-slate-400 font-mono mt-1">
                等待审核的观察
              </div>
            </div>
          </div>

          {/* Context Observations */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-4 hover:border-cyan-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.1s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">上下文池</div>
            <div className="text-4xl font-black mt-1 text-cyan-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.observations.context}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              已应用 {status.observations.context} 条
            </div>
          </div>

          {/* Total Observations */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-4 hover:border-purple-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.2s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">总观察数</div>
            <div className="text-4xl font-black mt-1 text-purple-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.observations.total}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-1">
              全部观察
            </div>
          </div>
        </div>

        {/* === Section 2: Charts Area === */}
        <div
          className="grid grid-cols-3 gap-3 mb-4"
          style={{ animation: 'fadeIn 0.6s ease-out 0.25s backwards' }}
        >
          {/* Left: Analysis Trend (2/3 width) */}
          <div className="col-span-2 border-4 border-slate-700 bg-slate-900 p-4 flex flex-col">
            <h3 className="text-xs font-bold text-amber-500 font-mono tracking-widest mb-2">
              分析趋势 · 近{stats?.trendDays || 30}天
            </h3>
            <AnalysisTrendChart
              data={stats?.analysisTrend || []}
              loading={statsLoading}
            />
          </div>

          {/* Right: Distribution + Gauge (1/3 width) */}
          <div className="flex flex-col gap-3">
            {/* Type Distribution Ring */}
            <div className="border-4 border-slate-700 bg-slate-900 p-3 flex-1 min-h-[190px]">
              <h3 className="text-xs font-bold text-cyan-400 font-mono tracking-widest mb-1">
                观察类型分布
              </h3>
              <TypeDistributionChart
                data={stats?.typeDistribution || []}
                loading={statsLoading}
              />
            </div>

            {/* Confidence Gauge */}
            <div className="border-4 border-slate-700 bg-slate-900 p-3">
              <h3 className="text-xs font-bold text-emerald-400 font-mono tracking-widest mb-0">
                系统置信度
              </h3>
              <ConfidenceGauge
                value={status.metrics.avgConfidence}
                loading={statsLoading}
              />
            </div>
          </div>
        </div>

        {/* === Section 3: Actions + Recent Analysis === */}
        <div
          className="grid grid-cols-3 gap-3 mb-4"
          style={{ animation: 'fadeIn 0.6s ease-out 0.3s backwards' }}
        >
          {/* Left: Quick Actions (2/3 width) */}
          <div className="col-span-2 border-4 border-slate-700 bg-slate-900 p-4">
            <h2 className="text-base font-black text-amber-500 mb-3 tracking-tight" style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}>
              快捷操作
            </h2>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/learning-review')}
                className="border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-3 px-4 transition-colors text-left group"
              >
                <div className="text-2xl mb-1">&rarr;</div>
                <div className="text-sm">审核观察</div>
                <div className="text-xs text-slate-400 mt-1">{status.observations.active} 条待审核</div>
              </button>

              <button
                onClick={() => navigate('/source-manager')}
                className="border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-mono font-bold py-3 px-4 transition-colors text-left group"
              >
                <div className="text-2xl mb-1">&hearts;</div>
                <div className="text-sm">配置编辑器</div>
                <div className="text-xs text-slate-400 mt-1">编辑源文件</div>
              </button>

              <ManualAnalysisTrigger />

              <button
                onClick={() => navigate('/settings')}
                className="border-2 border-slate-600 hover:border-slate-400 hover:bg-slate-400/10 text-slate-300 hover:text-slate-100 font-mono font-bold py-3 px-4 transition-colors text-left"
              >
                <div className="text-2xl mb-1">&equiv;</div>
                <div className="text-sm">系统设置</div>
                <div className="text-xs text-slate-400 mt-1">配置参数</div>
              </button>
            </div>
          </div>

          {/* Right: Recent Analysis (1/3 width) */}
          <div>
            <RecentAnalysisWidget maxItems={8} />
          </div>
        </div>

        {/* === Footer === */}
        <div className="border-t-2 border-slate-800 pt-4 text-center">
          <div className="text-xs font-mono text-slate-600">
            CLAUDE-EVOLUTION v{status.server.version} | 系统正常运行 | {formatUptime(status.server.uptime)} 运行时长
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
