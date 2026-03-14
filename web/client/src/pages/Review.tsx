import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient, ApiError } from '../api/client';
import type { Suggestion } from '../api/client';
import { toast } from '../components/Toast';
import BatchApprovalModal from '../components/BatchApprovalModal';

export default function Review() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 7.2: Modal 控制状态
  const [modalOpen, setModalOpen] = useState(false);
  // BATCH-REJECT-5: 批量拒绝 Modal 控制状态
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // DEBUG: 计数器
  const fetchCountRef = useRef(0);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    fetchCountRef.current += 1;
    console.log(`📋 fetchSuggestions called (${fetchCountRef.current} times total)`);
    console.trace('Call stack:'); // 打印调用栈
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSuggestions();
      console.log('✅ fetchSuggestions success, got', data.length, 'suggestions');
      setSuggestions(data);
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '加载建议列表失败';
      console.error('❌ fetchSuggestions error:', errorMessage);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 fetchSuggestions finished, loading =', false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiClient.approveSuggestion(id);
      toast.success('建议已批准');
      // 从列表中移除
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '批准失败';
      toast.error(errorMessage);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.rejectSuggestion(id);
      toast.success('建议已拒绝');
      // 从列表中移除
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '拒绝失败';
      toast.error(errorMessage);
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suggestions.map((s) => s.id));
    }
    setSelectAll(!selectAll);
  };

  // 切换单个选中状态
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 批量批准
  const handleBatchApprove = async () => {
    console.log('🔵 handleBatchApprove called');
    if (selectedIds.length === 0) {
      toast.error('请先选择要批准的建议');
      return;
    }

    try {
      await apiClient.batchApproveSuggestions(selectedIds);
      console.log('✅ batchApproveSuggestions success');
      // 注意: 不在这里刷新,由 onSuccess 回调处理
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '批量批准失败';
      console.error('❌ batchApproveSuggestions error:', errorMessage);
      toast.error(errorMessage);
      throw err; // 重新抛出错误以便 Modal 捕获
    }
  };

  // BATCH-REJECT-6: 批量拒绝
  const handleBatchReject = async () => {
    console.log('🔴 handleBatchReject called');
    if (selectedIds.length === 0) {
      toast.error('请先选择要拒绝的建议');
      return;
    }

    try {
      await apiClient.batchRejectSuggestions(selectedIds);
      console.log('✅ batchRejectSuggestions success');
      // 注意: 不在这里刷新,由 onSuccess 回调处理
    } catch (err) {
      const errorMessage =
        err instanceof ApiError ? err.message : '批量拒绝失败';
      console.error('❌ batchRejectSuggestions error:', errorMessage);
      toast.error(errorMessage);
      throw err; // 重新抛出错误以便 Modal 捕获
    }
  };

  // 7.6: onSuccess 回调：清空选择状态、刷新建议列表
  const handleBatchApproveSuccess = useCallback(() => {
    console.log('🟢 handleBatchApproveSuccess called');
    setSelectedIds([]);
    setSelectAll(false);
    fetchSuggestions();
  }, []); // 空依赖数组,函数引用不会变化

  // BATCH-REJECT-7: onSuccess 回调：清空选择状态、刷新建议列表
  const handleBatchRejectSuccess = useCallback(() => {
    console.log('🟣 handleBatchRejectSuccess called');
    setSelectedIds([]);
    setSelectAll(false);
    fetchSuggestions();
  }, []); // 空依赖数组,函数引用不会变化

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b-4 border-amber-500 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-black text-amber-500 tracking-tight"
                style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
              >
                审核建议
              </h1>
              <p className="text-sm text-slate-400 font-mono mt-1">
                批准或拒绝待审核的建议
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex gap-2">
              <a
                href="/"
                className="px-4 py-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 font-mono font-semibold rounded transition-colors border border-transparent hover:border-amber-500/30"
              >
                控制台
              </a>
              <a
                href="/review"
                className="px-4 py-2 text-amber-500 bg-amber-500/10 font-mono font-semibold rounded border border-amber-500/30"
              >
                审核建议
              </a>
              <a
                href="/source-manager"
                className="px-4 py-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 font-mono font-semibold rounded transition-colors border border-transparent hover:border-amber-500/30"
              >
                配置编辑
              </a>
              <a
                href="/settings"
                className="px-4 py-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 font-mono font-semibold rounded transition-colors border border-transparent hover:border-amber-500/30"
              >
                系统设置
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-amber-500 text-xl font-mono">
              加载建议列表中...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="border-4 border-red-500 bg-red-900/20 p-6 text-center">
            <div className="text-2xl mb-2">✕</div>
            <div className="text-red-400 font-mono">{error}</div>
            <button
              onClick={fetchSuggestions}
              className="mt-4 border-2 border-red-500 hover:bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && suggestions.length === 0 && (
          <div className="border-4 border-slate-700 bg-slate-900 p-12 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2
              className="text-2xl font-black text-slate-300 mb-2"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              暂无待审批建议
            </h2>
            <p className="text-slate-400 font-mono">
              所有建议已处理完毕
            </p>
            <button
              onClick={() => (window.location.href = '/')}
              className="mt-6 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-3 px-6 transition-colors"
            >
              ← 返回仪表盘
            </button>
          </div>
        )}

        {!loading && !error && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-700 pb-4">
              {/* 左侧：全选 + 已选数量 */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-5 h-5 bg-slate-800 border-2 border-amber-500 checked:bg-amber-500 cursor-pointer"
                  />
                  <span className="text-sm font-mono font-bold text-slate-300">
                    全选
                  </span>
                </label>

                {selectedIds.length > 0 ? (
                  <span className="text-amber-500 font-mono font-bold">
                    已选 {selectedIds.length} 条
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono">
                    共 {suggestions.length} 条待审核建议
                  </span>
                )}
              </div>

              {/* 右侧：批量操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={selectedIds.length === 0}
                  className={`
                    border-2 font-mono font-bold py-2 px-6 transition-colors
                    ${
                      selectedIds.length > 0
                        ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500'
                        : 'border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed'
                    }
                  `}
                >
                  {selectedIds.length > 0 ? `批准 ${selectedIds.length} 条` : '批量批准'}
                </button>

                {/* BATCH-REJECT-8: 批量拒绝按钮 */}
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={selectedIds.length === 0}
                  className={`
                    border-2 font-mono font-bold py-2 px-6 transition-colors
                    ${
                      selectedIds.length > 0
                        ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-500'
                        : 'border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed'
                    }
                  `}
                >
                  {selectedIds.length > 0 ? `拒绝 ${selectedIds.length} 条` : '批量拒绝'}
                </button>
              </div>
            </div>

            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                selected={selectedIds.includes(suggestion.id)}
                onToggleSelect={handleToggleSelect}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </main>

      {/* 7.4: 在底部渲染 BatchApprovalModal */}
      {/* 7.5: 传递必要的 props */}
      <BatchApprovalModal
        isOpen={modalOpen}
        selectedCount={selectedIds.length}
        onClose={() => setModalOpen(false)}
        onConfirm={handleBatchApprove}
        onSuccess={handleBatchApproveSuccess}
      />

      {/* BATCH-REJECT-9: 批量拒绝 Modal */}
      <BatchApprovalModal
        type="reject"
        isOpen={rejectModalOpen}
        selectedCount={selectedIds.length}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleBatchReject}
        onSuccess={handleBatchRejectSuccess}
      />
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function SuggestionCard({ suggestion, selected, onToggleSelect, onApprove, onReject }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const renderContent = () => {
    const { type, item } = suggestion;

    if (type === 'preference') {
      const pref = item as any;
      return (
        <>
          <div className="mb-2">
            <span className="text-xs font-bold text-amber-500 tracking-wider">
              类型
            </span>
            <span className="ml-2 text-sm">{pref.type}</span>
          </div>
          <div className="mb-2">
            <span className="text-xs font-bold text-amber-500 tracking-wider">
              描述
            </span>
            <p className="mt-1 text-sm">{pref.description}</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-400">
            <div>
              置信度: <span className="text-green-400">{Math.round(pref.confidence * 100)}%</span>
            </div>
            <div>频率: {pref.frequency} 次</div>
          </div>
        </>
      );
    }

    if (type === 'pattern') {
      const pattern = item as any;
      return (
        <>
          <div className="mb-2">
            <span className="text-xs font-bold text-amber-500 tracking-wider">
              问题
            </span>
            <p className="mt-1 text-sm">{pattern.problem}</p>
          </div>
          <div className="mb-2">
            <span className="text-xs font-bold text-amber-500 tracking-wider">
              解决方案
            </span>
            <p className="mt-1 text-sm">{pattern.solution}</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-400">
            <div>
              置信度: <span className="text-green-400">{Math.round(pattern.confidence * 100)}%</span>
            </div>
            <div>出现: {pattern.occurrences} 次</div>
          </div>
        </>
      );
    }

    if (type === 'workflow') {
      const workflow = item as any;
      return (
        <>
          <div className="mb-2">
            <span className="text-xs font-bold text-amber-500 tracking-wider">
              名称
            </span>
            <span className="ml-2 text-sm">{workflow.name}</span>
          </div>
          {expanded && workflow.steps && (
            <div className="mb-2">
              <span className="text-xs font-bold text-amber-500 tracking-wider">
                步骤
              </span>
              <ol className="mt-1 text-sm space-y-1 list-decimal list-inside">
                {workflow.steps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex gap-4 text-xs text-slate-400">
            <div>
              置信度: <span className="text-green-400">{Math.round(workflow.confidence * 100)}%</span>
            </div>
            <div>频率: {workflow.frequency} 次</div>
            {!expanded && workflow.steps && (
              <div>{workflow.steps.length} 个步骤</div>
            )}
          </div>
        </>
      );
    }

    return null;
  };

  const typeLabels = {
    preference: '偏好',
    pattern: '模式',
    workflow: '工作流',
  };

  const typeBorders = {
    preference: 'border-blue-500',
    pattern: 'border-purple-500',
    workflow: 'border-green-500',
  };

  return (
    <div
      className={`border-4 ${typeBorders[suggestion.type]} bg-slate-900 p-4 transition-all ${
        selected ? 'ring-2 ring-amber-500 bg-slate-800' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 复选框 */}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(suggestion.id)}
            className="w-5 h-5 bg-slate-800 border-2 border-amber-500 checked:bg-amber-500 cursor-pointer mt-1"
          />

          <span
            className={`px-2 py-1 text-xs font-bold border-2 ${typeBorders[suggestion.type]}`}
          >
            {typeLabels[suggestion.type]}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ID: {suggestion.id.slice(0, 8)}...
          </span>
        </div>
        {suggestion.type === 'workflow' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-400 hover:text-amber-500 font-mono"
          >
            {expanded ? '▼ 收起' : '▶ 展开'}
          </button>
        )}
      </div>

      {renderContent()}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onApprove(suggestion.id)}
          className="flex-1 border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono font-bold py-2 px-4 transition-colors"
        >
          ✓ 批准
        </button>
        <button
          onClick={() => setConfirmingReject(true)}
          className="flex-1 border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4 transition-colors"
        >
          ✕ 拒绝
        </button>
      </div>

      {/* 拒绝确认对话框 */}
      {confirmingReject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="border-4 border-red-500 bg-slate-900 p-6 max-w-md">
            <h3 className="text-xl font-black text-red-400 mb-4">
              确认拒绝
            </h3>
            <p className="text-slate-300 mb-6">
              确定要拒绝这条建议吗？此操作不可撤销。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onReject(suggestion.id);
                  setConfirmingReject(false);
                }}
                className="flex-1 border-2 border-red-500 bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4"
              >
                确认拒绝
              </button>
              <button
                onClick={() => setConfirmingReject(false)}
                className="flex-1 border-2 border-slate-600 text-slate-300 font-mono font-bold py-2 px-4"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
