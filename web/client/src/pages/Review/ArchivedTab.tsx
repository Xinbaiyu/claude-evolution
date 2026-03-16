import { useState } from 'react';
import { apiClient, ApiError, type ObservationWithMetadata } from '../../api/client';
import { toast } from '../../components/Toast';

interface ArchivedTabProps {
  observations: ObservationWithMetadata[];
  retentionDays: number;
  onRefresh: () => Promise<void>;
}

export default function ArchivedTab({ observations, retentionDays, onRefresh }: ArchivedTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState<'all' | 'user_ignored' | 'user_deleted' | 'capacity' | 'expired'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 计算过期倒计时
  const calculateExpiresIn = (archiveTimestamp: string): number => {
    const archived = new Date(archiveTimestamp);
    const expiresAt = new Date(archived.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  // 恢复观察到 Active Pool
  const handleRestoreToActive = async (id: string) => {
    try {
      await apiClient.unignoreObservation(id, 'active');
      toast.success('观察已恢复到活跃池');
      await onRefresh();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '恢复失败';
      toast.error(errorMessage);
    }
  };

  // 恢复观察到 Context Pool
  const handleRestoreToContext = async (id: string) => {
    try {
      await apiClient.unignoreObservation(id, 'context');
      toast.success('观察已恢复到上下文池');
      await onRefresh();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '恢复失败';
      toast.error(errorMessage);
    }
  };

  // 批量恢复到 Active Pool
  const handleBatchRestoreToActive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.info('请先选择要恢复的观察');
      return;
    }

    try {
      toast.info(`正在恢复 ${ids.length} 个观察到活跃池...`);
      const result = await apiClient.batchUnignoreObservations(ids, 'active');

      if (result.notFound > 0 || result.alreadyRestored > 0) {
        toast.warning(
          `完成：${result.restored} 恢复成功${
            result.alreadyRestored > 0 ? `, ${result.alreadyRestored} 已恢复` : ''
          }${result.notFound > 0 ? `, ${result.notFound} 未找到` : ''}`
        );
      } else {
        toast.success(`成功恢复 ${result.restored} 个观察到活跃池`);
      }

      setSelectedIds(new Set());
      await onRefresh();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量恢复失败';
      toast.error(errorMessage);
    }
  };

  // 批量恢复到 Context Pool
  const handleBatchRestoreToContext = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.info('请先选择要恢复的观察');
      return;
    }

    try {
      toast.info(`正在恢复 ${ids.length} 个观察到上下文池...`);
      const result = await apiClient.batchUnignoreObservations(ids, 'context');

      if (result.notFound > 0 || result.alreadyRestored > 0) {
        toast.warning(
          `完成：${result.restored} 恢复成功${
            result.alreadyRestored > 0 ? `, ${result.alreadyRestored} 已恢复` : ''
          }${result.notFound > 0 ? `, ${result.notFound} 未找到` : ''}`
        );
      } else {
        toast.success(`成功恢复 ${result.restored} 个观察到上下文池`);
      }

      setSelectedIds(new Set());
      await onRefresh();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量恢复失败';
      toast.error(errorMessage);
    }
  };

  // 永久删除
  const handleDeleteForever = async (id: string) => {
    if (!confirm('确定要永久删除此观察吗？此操作不可撤销，观察将被永久移除。')) {
      return;
    }

    try {
      await apiClient.deleteObservation(id);
      toast.success('观察已永久删除');
      await onRefresh();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '删除失败';
      toast.error(errorMessage);
    }
  };

  // 切换展开状态
  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // 切换选择状态
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredObservations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredObservations.map((obs) => obs.id)));
    }
  };

  // 过滤观察
  const filteredObservations = observations.filter((obs) => {
    // 原因过滤
    if (reasonFilter !== 'all') {
      if (reasonFilter === 'user_ignored') {
        // 匹配 user_ignored
        if (obs.archiveReason !== 'user_ignored') {
          return false;
        }
      } else if (reasonFilter === 'user_deleted') {
        // 匹配 user_deleted
        if (obs.archiveReason !== 'user_deleted') {
          return false;
        }
      } else if (reasonFilter === 'capacity') {
        // 匹配容量控制（active_capacity 或 context_capacity）
        if (obs.archiveReason !== 'active_capacity' && obs.archiveReason !== 'context_capacity') {
          return false;
        }
      } else if (reasonFilter === 'expired') {
        // 匹配过期
        if (obs.archiveReason !== 'expired') {
          return false;
        }
      }
    }

    // 搜索过滤
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const itemText = JSON.stringify(obs.item).toLowerCase();
      if (!itemText.includes(searchLower) && !obs.id.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  if (observations.length === 0) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 p-12 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h2
          className="text-2xl font-black text-slate-300 mb-2"
          style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
        >
          归档为空
        </h2>
        <p className="text-slate-400 font-mono">没有已归档的观察</p>
      </div>
    );
  }

  // 按归档原因分组（使用过滤后的观察）
  const groupedByReason = {
    capacity: filteredObservations.filter(
      (obs) => obs.archiveReason === 'active_capacity' || obs.archiveReason === 'context_capacity'
    ),
    expired: filteredObservations.filter((obs) => obs.archiveReason === 'expired'),
    user_ignored: filteredObservations.filter((obs) => obs.archiveReason === 'user_ignored'),
    user_deleted: filteredObservations.filter((obs) => obs.archiveReason === 'user_deleted'),
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="space-y-4">
        {/* Search Box */}
        <input
          type="text"
          placeholder="搜索归档观察（ID、内容...）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Reason Filter */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-slate-400 font-mono">归档原因:</span>
          {(['all', 'user_ignored', 'user_deleted', 'capacity', 'expired'] as const).map((reason) => (
            <button
              key={reason}
              onClick={() => setReasonFilter(reason)}
              className={`
                px-4 py-2 font-mono font-bold text-sm transition-colors border-2
                ${
                  reasonFilter === reason
                    ? 'border-purple-500 bg-purple-500/20 text-purple-500'
                    : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                }
              `}
            >
              {reason === 'all' && '全部'}
              {reason === 'user_ignored' && '已忽略'}
              {reason === 'user_deleted' && '用户删除'}
              {reason === 'capacity' && '容量控制'}
              {reason === 'expired' && '已过期'}
            </button>
          ))}
          <span className="text-sm text-slate-500 font-mono ml-2">
            （显示 {filteredObservations.length} / {observations.length}）
          </span>
        </div>
      </div>

      {/* Batch Operation Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-[73px] z-40 bg-purple-500/20 border-4 border-purple-500 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold font-mono text-purple-500">
                ✓ {selectedIds.size} 已选
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBatchRestoreToActive}
                className="border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-mono font-bold py-2 px-4 transition-colors"
              >
                ↻ 恢复到活跃池
              </button>

              <button
                onClick={handleBatchRestoreToContext}
                className="border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-mono font-bold py-2 px-4 transition-colors"
              >
                ↻ 恢复到上下文池
              </button>

              <div className="h-8 w-px bg-slate-600"></div>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="border-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono font-bold py-2 px-4 transition-colors"
              >
                ✕ 清除选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      <div className="border-4 border-purple-500/30 bg-purple-500/5 p-6">
        <h3 className="text-lg font-black text-purple-400 mb-4 font-mono">归档统计</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border-2 border-slate-600 bg-slate-800 p-4">
            <div className="text-xs text-slate-400">总数</div>
            <div className="text-3xl font-black text-purple-400 mt-1">{observations.length}</div>
          </div>
          <div className="border-2 border-slate-600 bg-slate-800 p-4">
            <div className="text-xs text-slate-400">已忽略</div>
            <div className="text-3xl font-black text-orange-400 mt-1">
              {groupedByReason.user_ignored.length}
            </div>
          </div>
          <div className="border-2 border-slate-600 bg-slate-800 p-4">
            <div className="text-xs text-slate-400">用户删除</div>
            <div className="text-3xl font-black text-red-400 mt-1">
              {groupedByReason.user_deleted.length}
            </div>
          </div>
          <div className="border-2 border-slate-600 bg-slate-800 p-4">
            <div className="text-xs text-slate-400">容量控制</div>
            <div className="text-3xl font-black text-amber-400 mt-1">
              {groupedByReason.capacity.length}
            </div>
          </div>
        </div>
      </div>

      {/* Archived Observations List */}
      <div className="space-y-3">
        {/* List Header with Select All */}
        {filteredObservations.length > 0 && (
          <div className="flex items-center gap-3 pb-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredObservations.length && filteredObservations.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 border-2 border-slate-600 bg-slate-800 checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
                aria-label="全选/取消全选"
              />
              <span className="ml-2 text-sm text-slate-400 font-mono">
                {selectedIds.size === filteredObservations.length && filteredObservations.length > 0
                  ? '取消全选'
                  : '全选当前页'}
              </span>
            </label>
          </div>
        )}

        {filteredObservations.length === 0 ? (
          <div className="border-4 border-slate-700 bg-slate-900 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2
              className="text-2xl font-black text-slate-300 mb-2"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              无匹配结果
            </h2>
            <p className="text-slate-400 font-mono">尝试调整搜索或过滤条件</p>
          </div>
        ) : (
          filteredObservations.map((obs) => {
          const expiresIn = obs.archiveTimestamp ? calculateExpiresIn(obs.archiveTimestamp) : 0;
          const isExpanded = expandedIds.has(obs.id);
          const isExpiringSoon = expiresIn <= 7;

          return (
            <div
              key={obs.id}
              className={`border-4 p-4 transition-colors ${
                selectedIds.has(obs.id)
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-purple-500/30 bg-slate-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Selection Checkbox */}
                  <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(obs.id)}
                      onChange={() => toggleSelection(obs.id)}
                      className="w-5 h-5 border-2 border-slate-600 bg-slate-800 checked:bg-purple-500 checked:border-purple-500 cursor-pointer"
                      aria-label={`选择观察 ${obs.id}`}
                    />
                  </label>

                  {/* Type Badge */}
                  <span className="px-2 py-1 text-xs font-bold border-2 border-purple-500 text-purple-400">
                    {obs.type === 'preference' && '偏好'}
                    {obs.type === 'pattern' && '模式'}
                    {obs.type === 'workflow' && '工作流'}
                  </span>

                  {/* ID */}
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {obs.id.slice(0, 12)}...
                  </span>

                  {/* Archive Reason Badge */}
                  {obs.archiveReason && (
                    <span className="px-2 py-1 text-xs font-bold bg-slate-700 border border-slate-500 text-slate-300">
                      {(obs.archiveReason === 'active_capacity' || obs.archiveReason === 'context_capacity') && '容量控制'}
                      {obs.archiveReason === 'expired' && '过期'}
                      {obs.archiveReason === 'user_ignored' && '已忽略'}
                      {obs.archiveReason === 'user_deleted' && '用户删除'}
                    </span>
                  )}

                  {/* Expiring Soon Warning */}
                  {isExpiringSoon && expiresIn > 0 && (
                    <span className="px-2 py-1 text-xs font-bold bg-orange-500/20 border border-orange-500 text-orange-400">
                      ⚠ 即将过期
                    </span>
                  )}
                </div>

                {/* Expand Toggle */}
                <button
                  onClick={() => toggleExpanded(obs.id)}
                  className="text-slate-400 hover:text-purple-400 font-mono text-sm px-2 py-1"
                >
                  {isExpanded ? '▼ 收起' : '▶ 展开'}
                </button>
              </div>

              {/* Content Preview (Collapsed) */}
              {!isExpanded && (
                <div className="mb-3 text-sm text-slate-400">
                  {obs.type === 'preference' && (obs.item as any).description}
                  {obs.type === 'pattern' && (obs.item as any).problem}
                  {obs.type === 'workflow' && (obs.item as any).name}
                </div>
              )}

              {/* Content Details (Expanded) */}
              {isExpanded && (
                <div className="mb-3 space-y-2">
                  {obs.type === 'preference' && (
                    <>
                      <div>
                        <span className="text-xs font-bold text-purple-400">类型:</span>
                        <span className="ml-2 text-sm">{(obs.item as any).type}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-400">描述:</span>
                        <p className="mt-1 text-sm text-slate-300">{(obs.item as any).description}</p>
                      </div>
                    </>
                  )}

                  {obs.type === 'pattern' && (
                    <>
                      <div>
                        <span className="text-xs font-bold text-purple-400">问题:</span>
                        <p className="mt-1 text-sm text-slate-300">{(obs.item as any).problem}</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-400">解决方案:</span>
                        <p className="mt-1 text-sm text-slate-300">{(obs.item as any).solution}</p>
                      </div>
                    </>
                  )}

                  {obs.type === 'workflow' && (
                    <>
                      <div>
                        <span className="text-xs font-bold text-purple-400">名称:</span>
                        <span className="ml-2 text-sm">{(obs.item as any).name}</span>
                      </div>
                      {(obs.item as any).steps && (
                        <div>
                          <span className="text-xs font-bold text-purple-400">步骤:</span>
                          <ol className="mt-1 text-sm space-y-1 list-decimal list-inside text-slate-300">
                            {(obs.item as any).steps.map((step: string, i: number) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Metadata and Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                {/* Archive Info */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  {obs.archiveTimestamp && (
                    <>
                      <div>
                        归档于: {new Date(obs.archiveTimestamp).toLocaleString('zh-CN')}
                      </div>
                      <div className={isExpiringSoon ? 'text-orange-400 font-bold' : ''}>
                        {expiresIn > 0 ? (
                          <>过期倒计时: {expiresIn} 天</>
                        ) : (
                          <span className="text-red-400">已过期（待清理）</span>
                        )}
                      </div>
                    </>
                  )}
                  <div>
                    置信度: {(obs.originalConfidence * 100).toFixed(0)}%
                  </div>
                  <div>提及: {obs.mentions} 次</div>

                  {/* Suppression Statistics */}
                  {obs.suppressionCount && obs.suppressionCount > 0 && (
                    <div className="text-orange-400 font-bold">
                      🔁 相似观察再次出现 {obs.suppressionCount} 次
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {obs.archiveReason === 'user_ignored' ? (
                    <>
                      <button
                        onClick={() => handleRestoreToActive(obs.id)}
                        className="border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono font-bold py-2 px-4 transition-colors text-sm"
                      >
                        ✓ 取消忽略（恢复到活跃池）
                      </button>
                      <button
                        onClick={() => handleRestoreToContext(obs.id)}
                        className="border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono font-bold py-2 px-4 transition-colors text-sm"
                      >
                        ✓ 取消忽略（恢复到上下文池）
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestoreToActive(obs.id)}
                        className="border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono font-bold py-2 px-4 transition-colors text-sm"
                      >
                        ↻ 恢复到活跃池
                      </button>
                      <button
                        onClick={() => handleRestoreToContext(obs.id)}
                        className="border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono font-bold py-2 px-4 transition-colors text-sm"
                      >
                        ↻ 恢复到上下文池
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteForever(obs.id)}
                    className="border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold py-2 px-4 transition-colors text-sm"
                  >
                    × 永久删除
                  </button>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
