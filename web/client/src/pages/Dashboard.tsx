import { useEffect, useState } from 'react';

interface SystemStatus {
  scheduler: {
    enabled: boolean;
    interval: string;
    lastRun: string | null;
  };
  suggestions: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  metrics: {
    avgConfidence: number;
  };
  server: {
    uptime: number;
    version: string;
  };
}

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:10010/api/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-amber-500 text-xl font-mono">LOADING SYSTEM DATA</div>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500 text-xl font-mono">SYSTEM ERROR: FAILED TO LOAD</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b-4 border-amber-500 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-amber-500 tracking-tight" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
                CLAUDE EVOLUTION
              </h1>
              <p className="text-sm text-slate-400 font-mono mt-1">AI Learning System Monitor</p>
            </div>

            {/* System Status Indicator */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 font-mono">SCHEDULER</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${status.scheduler.enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-mono font-bold">
                    {status.scheduler.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>

              <div className="h-12 w-px bg-slate-700"></div>

              <div className="text-right">
                <div className="text-xs text-slate-500 font-mono">LAST RUN</div>
                <div className="text-sm font-mono font-bold mt-1">
                  {formatDate(status.scheduler.lastRun)}
                </div>
              </div>

              <div className="h-12 w-px bg-slate-700"></div>

              <div className="text-right">
                <div className="text-xs text-slate-500 font-mono">UPTIME</div>
                <div className="text-sm font-mono font-bold mt-1">
                  {formatUptime(status.server.uptime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Pending Suggestions - Largest */}
          <div
            className="col-span-2 border-4 border-amber-500 bg-slate-900 p-6 relative overflow-hidden group hover:border-amber-400 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out' }}
          >
            <div className="absolute top-0 right-0 text-[120px] font-black text-amber-500/5 leading-none">
              {status.suggestions.pending}
            </div>
            <div className="relative z-10">
              <div className="text-xs text-amber-500 font-mono font-bold tracking-widest">PENDING REVIEW</div>
              <div className="text-6xl font-black mt-2 text-amber-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {status.suggestions.pending}
              </div>
              <div className="text-sm text-slate-400 font-mono mt-2">
                Suggestions awaiting approval
              </div>
            </div>
          </div>

          {/* Approved Count */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-cyan-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.1s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">APPROVED</div>
            <div className="text-5xl font-black mt-2 text-cyan-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.suggestions.approved}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              +{status.suggestions.approved} total
            </div>
          </div>

          {/* Confidence Score */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-green-500 transition-colors"
            style={{ animation: 'slideInRight 0.6s ease-out 0.2s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">CONFIDENCE</div>
            <div className="text-5xl font-black mt-2 text-green-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {Math.round(status.metrics.avgConfidence * 100)}
              <span className="text-2xl text-slate-600">%</span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              Average score
            </div>
          </div>

          {/* Rejected Count */}
          <div
            className="border-4 border-slate-700 bg-slate-900 p-6 hover:border-red-500 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out 0.15s backwards' }}
          >
            <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">REJECTED</div>
            <div className="text-5xl font-black mt-2 text-red-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status.suggestions.rejected}
            </div>
            <div className="text-xs text-slate-500 font-mono mt-2">
              Dismissed
            </div>
          </div>

          {/* Total Processed */}
          <div
            className="col-span-3 border-4 border-slate-700 bg-slate-900 p-6 hover:border-slate-500 transition-colors"
            style={{ animation: 'slideInLeft 0.6s ease-out 0.25s backwards' }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-500 font-mono font-bold tracking-widest">TOTAL PROCESSED</div>
                <div className="text-4xl font-black mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {status.suggestions.total}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 ml-8">
                <div className="h-2 bg-slate-800 relative overflow-hidden">
                  <div
                    className="absolute h-full bg-amber-500"
                    style={{
                      width: `${(status.suggestions.approved / status.suggestions.total) * 100}%`,
                      transition: 'width 1s ease-out'
                    }}
                  ></div>
                  <div
                    className="absolute h-full bg-red-500"
                    style={{
                      left: `${(status.suggestions.approved / status.suggestions.total) * 100}%`,
                      width: `${(status.suggestions.rejected / status.suggestions.total) * 100}%`,
                      transition: 'width 1s ease-out, left 1s ease-out'
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-500 mt-2">
                  <span>{Math.round((status.suggestions.approved / status.suggestions.total) * 100)}% approved</span>
                  <span>{Math.round((status.suggestions.rejected / status.suggestions.total) * 100)}% rejected</span>
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
          <h2 className="text-lg font-black text-amber-500 mb-4 tracking-tight" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
            QUICK ACTIONS
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/review'}
              className="border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-4 px-6 transition-colors text-left group"
            >
              <div className="text-2xl mb-1">→</div>
              <div className="text-sm">REVIEW SUGGESTIONS</div>
              <div className="text-xs text-slate-400 mt-1">{status.suggestions.pending} pending</div>
            </button>

            <button
              className="border-2 border-slate-600 hover:border-cyan-500 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-500 font-mono font-bold py-4 px-6 transition-colors text-left"
            >
              <div className="text-2xl mb-1">↻</div>
              <div className="text-sm">RUN ANALYSIS</div>
              <div className="text-xs text-slate-400 mt-1">Manual trigger</div>
            </button>

            <button
              onClick={() => window.location.href = '/settings'}
              className="border-2 border-slate-600 hover:border-slate-400 hover:bg-slate-400/10 text-slate-300 hover:text-slate-100 font-mono font-bold py-4 px-6 transition-colors text-left"
            >
              <div className="text-2xl mb-1">⚙</div>
              <div className="text-sm">SETTINGS</div>
              <div className="text-xs text-slate-400 mt-1">Configure system</div>
            </button>
          </div>
        </div>

        {/* System Info Footer */}
        <div className="border-t-2 border-slate-800 pt-4 text-center">
          <div className="text-xs font-mono text-slate-600">
            CLAUDE-EVOLUTION v{status.server.version} | SYSTEM OPERATIONAL | {formatUptime(status.server.uptime)} UPTIME
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
    </div>
  );
}
