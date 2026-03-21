import { useEffect, useState } from 'react';
import { apiClient, type AnalysisRun } from '../api/client';
import AnalysisRunCard from '../components/AnalysisRunCard';
import { toast } from '../components/Toast';

export default function AnalysisLogs() {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAnalysisLogs({
        limit: pageSize,
        offset: page * pageSize,
      });
      setRuns(data);
    } catch (error: any) {
      toast.error(error.message || '加载分析日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (runs.length === pageSize) {
      setPage(page + 1);
    }
  };

  return (
    <>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-mono font-bold rounded transition-colors"
          >
            刷新
          </button>
        </div>
        {loading && runs.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-amber-500 text-xl font-mono">
              加载中...
            </div>
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">暂无分析记录</div>
            <p className="text-gray-500 mt-2">
              分析记录将在下次分析任务执行后出现
            </p>
          </div>
        ) : (
          <>
            {/* Logs List */}
            <div className="space-y-4">
              {runs.map((run) => (
                <AnalysisRunCard key={run.id} run={run} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={handlePrevPage}
                disabled={page === 0}
                className={`px-4 py-2 font-mono font-bold rounded transition-colors ${
                  page === 0
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                ← 上一页
              </button>

              <div className="text-sm text-gray-400 font-mono">
                第 {page + 1} 页
              </div>

              <button
                onClick={handleNextPage}
                disabled={runs.length < pageSize}
                className={`px-4 py-2 font-mono font-bold rounded transition-colors ${
                  runs.length < pageSize
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                下一页 →
              </button>
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </>
  );
}
