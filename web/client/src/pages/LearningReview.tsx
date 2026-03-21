import { useEffect, useState } from 'react';
import { apiClient, ApiError, type ObservationWithMetadata, type Config } from '../api/client';
import { toast } from '../components/Toast';
import ArchivedTab from './Review/ArchivedTab';
import BatchOperationBar from '../components/BatchOperationBar';
import OperationGuide from '../components/OperationGuide';
import { wsClient } from '../api/websocket';

type TierType = 'gold' | 'silver' | 'bronze' | 'all';
type ObservationType = 'preference' | 'pattern' | 'workflow' | 'all';
type TabType = 'active' | 'context' | 'archived';

export default function LearningReview() {
  const [activeObservations, setActiveObservations] = useState<ObservationWithMetadata[]>([]);
  const [contextObservations, setContextObservations] = useState<ObservationWithMetadata[]>([]);
  const [archivedObservations, setArchivedObservations] = useState<ObservationWithMetadata[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedTier, setSelectedTier] = useState<TierType>('all');
  const [selectedType, setSelectedType] = useState<ObservationType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedTiers, setCollapsedTiers] = useState<Set<TierType>>(new Set());

  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 帮助对话框状态
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadObservations();
    loadConfig();

    // WebSocket 事件监听
    const unsubscribeArchived = wsClient.on('observation_archived', () => {
      // 归档事件：静默刷新列表
      loadObservations(true);
    });

    const unsubscribePromoted = wsClient.on('observation_promoted', () => {
      // 提升事件：静默刷新列表
      loadObservations(true);
    });

    const unsubscribeDemoted = wsClient.on('observation_demoted', () => {
      // 降级事件：静默刷新列表
      loadObservations(true);
    });

    const unsubscribeRestored = wsClient.on('observation_restored', () => {
      // 恢复事件：静默刷新列表
      loadObservations(true);
    });

    const unsubscribePinned = wsClient.on('observation:pinned', (msg) => {
      // Pin 事件：静默刷新列表
      console.log('[WS] Received observation:pinned event:', msg);
      loadObservations(true);
    });

    const unsubscribeUnpinned = wsClient.on('observation:unpinned', (msg) => {
      // Unpin 事件：静默刷新列表
      console.log('[WS] Received observation:unpinned event:', msg);
      loadObservations(true);
    });

    const unsubscribeBatchPinned = wsClient.on('observation:batch_pinned', () => {
      // 批量 Pin 事件：静默刷新列表
      loadObservations(true);
    });

    const unsubscribeBatchUnpinned = wsClient.on('observation:batch_unpinned', () => {
      // 批量 Unpin 事件：静默刷新列表
      loadObservations(true);
    });

    // 清理函数
    return () => {
      unsubscribeArchived();
      unsubscribePromoted();
      unsubscribeDemoted();
      unsubscribeRestored();
      unsubscribePinned();
      unsubscribeUnpinned();
      unsubscribeBatchPinned();
      unsubscribeBatchUnpinned();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiClient.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadObservations = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      console.log('[LoadObservations] Starting load...');
      const data = await apiClient.getLearningObservations();
      const firstContext = data.context?.[0];
      console.log('[LoadObservations] Received data:', {
        activeCount: data.active?.length,
        contextCount: data.context?.length,
        firstContextId: firstContext?.id,
        firstContextPinned: firstContext?.pinned,
        firstContextPinnedBy: firstContext?.pinnedBy,
        firstContextPinnedAt: firstContext?.pinnedAt,
      });
      setActiveObservations(data.active || []);
      setContextObservations(data.context || []);
      setArchivedObservations(data.archived || []);
      console.log('[LoadObservations] State updated');
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '加载观察列表失败';
      toast.error(errorMessage);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // 计算观察的层级
  const calculateTier = (obs: ObservationWithMetadata): TierType => {
    if (obs.originalConfidence >= 0.75 && obs.mentions >= 5) return 'gold';
    if (obs.originalConfidence >= 0.60 && obs.mentions >= 3) return 'silver';
    return 'bronze';
  };

  // 计算时间衰减后的置信度（简化版，实际应从配置获取半衰期）
  const calculateDecayedConfidence = (obs: ObservationWithMetadata): number => {
    const now = new Date();
    const firstSeen = new Date(obs.firstSeen);
    const daysSinceFirst = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
    const halfLifeDays = 30; // 假设半衰期为 30 天，实际应从配置读取
    const decayFactor = Math.pow(0.5, daysSinceFirst / halfLifeDays);
    return obs.originalConfidence * decayFactor;
  };

  // 过滤观察（根据当前 Tab）
  const currentObservations = activeTab === 'active' ? activeObservations : activeTab === 'context' ? contextObservations : archivedObservations;

  const filteredObservations = currentObservations.filter((obs) => {
    // 层级过滤
    if (selectedTier !== 'all' && calculateTier(obs) !== selectedTier) {
      return false;
    }

    // 类型过滤
    if (selectedType !== 'all' && obs.type !== selectedType) {
      return false;
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

  // 按层级分组
  const groupedByTier = {
    gold: filteredObservations
      .filter((obs) => calculateTier(obs) === 'gold')
      .sort((a, b) => {
        // Context Pool: 固定的观察排在前面
        if (activeTab === 'context') {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
        }
        return 0; // 保持原有顺序
      }),
    silver: filteredObservations
      .filter((obs) => calculateTier(obs) === 'silver')
      .sort((a, b) => {
        if (activeTab === 'context') {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
        }
        return 0;
      }),
    bronze: filteredObservations
      .filter((obs) => calculateTier(obs) === 'bronze')
      .sort((a, b) => {
        if (activeTab === 'context') {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
        }
        return 0;
      }),
  };

  // 批量提升 Gold 观察
  const handleBulkApproveGold = async () => {
    const goldObs = groupedByTier.gold.filter((obs) => !obs.inContext);
    if (goldObs.length === 0) {
      toast.info('没有待提升的 Gold 观察');
      return;
    }

    try {
      for (const obs of goldObs) {
        await apiClient.promoteObservation(obs.id);
      }
      toast.success(`成功提升 ${goldObs.length} 个 Gold 观察`);
      await loadObservations();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量提升失败';
      toast.error(errorMessage);
    }
  };

  // 切换层级折叠状态
  const toggleTierCollapse = (tier: TierType) => {
    const newSet = new Set(collapsedTiers);
    if (newSet.has(tier)) {
      newSet.delete(tier);
    } else {
      newSet.add(tier);
    }
    setCollapsedTiers(newSet);
  };

  // 批量选择处理函数
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const allIds = new Set(filteredObservations.map((obs) => obs.id));
    setSelectedIds(allIds);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // 计算选中数量
  const visibleSelectedCount = filteredObservations.filter((obs) =>
    selectedIds.has(obs.id)
  ).length;
  const hiddenSelectedCount = selectedIds.size - visibleSelectedCount;

  // 批量操作处理函数
  const handleBatchPromote = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      toast.info('请先选择要提升的观察');
      return;
    }

    if (ids.length > 200) {
      toast.error('一次最多只能操作 200 个观察');
      return;
    }

    if (ids.length > 50) {
      if (!confirm(`您选择了 ${ids.length} 个观察，处理可能需要一些时间。是否继续？`)) {
        return;
      }
    }

    try {
      toast.info(`正在处理 ${ids.length} 个观察...`);
      const result = await apiClient.batchPromoteObservations(ids);

      if (result.failed > 0) {
        toast.warning(`完成：${result.succeeded} 成功，${result.failed} 失败`);
      } else {
        toast.success(`成功提升 ${result.succeeded} 个观察`);
      }

      clearSelection();
      await loadObservations(true); // 静默刷新，避免页面闪烁
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量提升失败';
      toast.error(errorMessage);
    }
  };

  const handleBatchIgnore = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      toast.info('请先选择要忽略的观察');
      return;
    }

    if (ids.length > 200) {
      toast.error('一次最多只能操作 200 个观察');
      return;
    }

    const reason = prompt('忽略原因（可选）：');
    if (reason === null) return; // 用户取消

    try {
      toast.info(`正在处理 ${ids.length} 个观察...`);
      const result = await apiClient.batchIgnoreObservations(ids, reason || undefined);

      if (result.failed > 0) {
        toast.warning(`完成：${result.succeeded} 成功，${result.failed} 失败`);
      } else {
        toast.success(`成功忽略 ${result.succeeded} 个观察`);
      }

      clearSelection();
      await loadObservations(true); // 静默刷新，避免页面闪烁
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量忽略失败';
      toast.error(errorMessage);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      toast.info('请先选择要删除的观察');
      return;
    }

    if (ids.length > 200) {
      toast.error('一次最多只能操作 200 个观察');
      return;
    }

    const retentionDays = config?.learning?.retention?.archivedDays || 30;
    if (!confirm(
      `确定要删除 ${ids.length} 个观察吗？\n\n这些观察将被移动到归档池，并在 ${retentionDays} 天后永久删除。`
    )) {
      return;
    }

    try {
      toast.info(`正在处理 ${ids.length} 个观察...`);
      const result = await apiClient.batchDeleteObservations(ids);

      if (result.failed > 0) {
        toast.warning(`完成：${result.succeeded} 成功，${result.failed} 失败`);
      } else {
        toast.success(`成功删除 ${result.succeeded} 个观察`);
      }

      clearSelection();
      await loadObservations(true); // 静默刷新，避免页面闪烁
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量删除失败';
      toast.error(errorMessage);
    }
  };

  const handleBatchPin = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      toast.info('请先选择要固定的观察');
      return;
    }

    try {
      toast.info(`正在固定 ${ids.length} 个观察...`);
      const result = await apiClient.batchPinObservations(ids);

      if (result.notFound > 0 || result.alreadyPinned > 0) {
        toast.warning(
          `完成：${result.pinned} 固定成功${
            result.alreadyPinned > 0 ? `, ${result.alreadyPinned} 已固定` : ''
          }${result.notFound > 0 ? `, ${result.notFound} 未找到` : ''}`
        );
      } else {
        toast.success(`成功固定 ${result.pinned} 个观察`);
      }

      clearSelection();
      await loadObservations(true); // 静默刷新，避免页面闪烁
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量固定失败';
      toast.error(errorMessage);
    }
  };

  const handleBatchUnpin = async () => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) {
      toast.info('请先选择要取消固定的观察');
      return;
    }

    try {
      toast.info(`正在取消固定 ${ids.length} 个观察...`);
      const result = await apiClient.batchUnpinObservations(ids);

      if (result.notFound > 0 || result.alreadyUnpinned > 0) {
        toast.warning(
          `完成：${result.unpinned} 取消固定成功${
            result.alreadyUnpinned > 0 ? `, ${result.alreadyUnpinned} 已取消` : ''
          }${result.notFound > 0 ? `, ${result.notFound} 未找到` : ''}`
        );
      } else {
        toast.success(`成功取消固定 ${result.unpinned} 个观察`);
      }

      clearSelection();
      await loadObservations(true); // 静默刷新，避免页面闪烁
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : '批量取消固定失败';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b-2 border-slate-700 flex justify-between items-end">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'active'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              活跃池 ({activeObservations.length})
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'context'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              上下文池 ({contextObservations.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'archived'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              归档池 ({archivedObservations.length})
            </button>
          </nav>
          <button
            onClick={() => setShowGuide(true)}
            className="group relative border-2 border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono font-bold p-1.5 mb-1 transition-colors"
            title="查看操作指南"
          >
            <span className="text-sm">?</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 border border-cyan-500 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              操作指南
            </span>
          </button>
        </div>

        {/* Pinned Observations Warning */}
        {activeTab === 'context' && (() => {
          const pinnedCount = contextObservations.filter((obs) => obs.pinned).length;
          if (pinnedCount >= 20) {
            return (
              <div className="mb-6 border-4 border-amber-500 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-bold text-amber-500 mb-1">
                      固定观察数量提示
                    </h3>
                    <p className="text-sm text-slate-300">
                      您当前已固定 <strong className="text-amber-500">{pinnedCount}</strong> 个观察。
                      过多的固定观察可能会影响容量管理效率。建议定期审查并取消固定不再需要的观察。
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Filters and Actions (only for active/context tabs) */}
        {activeTab !== 'archived' && (
        <div className="mb-6 space-y-4">
          {/* Search and Bulk Actions */}
          <div className="flex gap-4">
            {/* Search Box */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜索观察（ID、内容...）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Bulk Approve Gold Button */}
            <button
              onClick={handleBulkApproveGold}
              disabled={groupedByTier.gold.filter((obs) => !obs.inContext).length === 0}
              className={`
                border-2 font-mono font-bold py-2 px-6 transition-colors whitespace-nowrap
                ${
                  groupedByTier.gold.filter((obs) => !obs.inContext).length > 0
                    ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500'
                    : 'border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed'
                }
              `}
            >
              🥇 批量提升 Gold
            </button>
          </div>

          {/* Tier and Type Filters */}
          <div className="flex gap-4 justify-between items-center">
            <div className="flex gap-4">
              {/* Tier Filter */}
              <div className="flex gap-2">
                <span className="text-sm text-slate-400 font-mono py-2">层级:</span>
                {(['all', 'gold', 'silver', 'bronze'] as TierType[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`
                      px-4 py-2 font-mono font-bold text-sm transition-colors border-2
                      ${
                        selectedTier === tier
                          ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                          : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                      }
                    `}
                  >
                    {tier === 'all' && '全部'}
                    {tier === 'gold' && '🥇 Gold'}
                    {tier === 'silver' && '🥈 Silver'}
                    {tier === 'bronze' && '🥉 Bronze'}
                  </button>
                ))}
              </div>

              {/* Type Filter */}
              <div className="flex gap-2">
                <span className="text-sm text-slate-400 font-mono py-2">类型:</span>
                {(['all', 'preference', 'pattern', 'workflow'] as ObservationType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`
                      px-4 py-2 font-mono font-bold text-sm transition-colors border-2
                      ${
                        selectedType === type
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-500'
                          : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                      }
                    `}
                  >
                    {type === 'all' && '全部'}
                    {type === 'preference' && '偏好'}
                    {type === 'pattern' && '模式'}
                    {type === 'workflow' && '工作流'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select All Checkbox */}
            {filteredObservations.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filteredObservations.length > 0 &&
                    filteredObservations.every((obs) => selectedIds.has(obs.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAll();
                    } else {
                      clearSelection();
                    }
                  }}
                  className="w-5 h-5 border-2 border-slate-600 bg-slate-800 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
                  aria-label="全选/取消全选"
                  data-testid="select-all-checkbox"
                />
                <span className="text-sm font-mono text-slate-400">
                  全选 ({filteredObservations.length})
                </span>
              </label>
            )}
          </div>
        </div>
        )}

        {/* Batch Operation Bar */}
        {activeTab !== 'archived' && !loading && (
          <BatchOperationBar
            selectedCount={selectedIds.size}
            hiddenCount={hiddenSelectedCount}
            onPromote={handleBatchPromote}
            onIgnore={handleBatchIgnore}
            onDelete={handleBatchDelete}
            onClearSelection={clearSelection}
            pool={activeTab as 'active' | 'context'}
            onPin={activeTab === 'context' ? handleBatchPin : undefined}
            onUnpin={activeTab === 'context' ? handleBatchUnpin : undefined}
          />
        )}

        {/* Archived Tab Content */}
        {activeTab === 'archived' && !loading && (
          <ArchivedTab
            observations={archivedObservations}
            retentionDays={config?.learning?.retention.archivedDays || 30}
            onRefresh={loadObservations}
          />
        )}

        {/* Active/Context Tab Loading */}
        {activeTab !== 'archived' && loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-amber-500 text-xl font-mono">
              加载观察列表中...
            </div>
          </div>
        )}

        {activeTab !== 'archived' && !loading && filteredObservations.length === 0 && (
          <div className="border-4 border-slate-700 bg-slate-900 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2
              className="text-2xl font-black text-slate-300 mb-2"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              {currentObservations.length === 0 ? '暂无观察数据' : '无匹配结果'}
            </h2>
            <p className="text-slate-400 font-mono">
              {currentObservations.length === 0
                ? '学习系统尚未生成观察数据'
                : '尝试调整筛选条件或搜索关键词'}
            </p>
          </div>
        )}

        {activeTab !== 'archived' && !loading && filteredObservations.length > 0 && (
          <div className="space-y-6">
            {/* Gold Tier Section */}
            {groupedByTier.gold.length > 0 && (
              <TierSection
                tier="gold"
                title="🥇 Gold 层级（自动提升候选）"
                count={groupedByTier.gold.length}
                collapsed={collapsedTiers.has('gold')}
                onToggle={() => toggleTierCollapse('gold')}
                observations={groupedByTier.gold}
                calculateDecayedConfidence={calculateDecayedConfidence}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                pool={activeTab as 'active' | 'context'}
              />
            )}

            {/* Silver Tier Section */}
            {groupedByTier.silver.length > 0 && (
              <TierSection
                tier="silver"
                title="🥈 Silver 层级（高优先级）"
                count={groupedByTier.silver.length}
                collapsed={collapsedTiers.has('silver')}
                onToggle={() => toggleTierCollapse('silver')}
                observations={groupedByTier.silver}
                calculateDecayedConfidence={calculateDecayedConfidence}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                pool={activeTab as 'active' | 'context'}
              />
            )}

            {/* Bronze Tier Section */}
            {groupedByTier.bronze.length > 0 && (
              <TierSection
                tier="bronze"
                title="🥉 Bronze 层级（标准候选）"
                count={groupedByTier.bronze.length}
                collapsed={collapsedTiers.has('bronze')}
                onToggle={() => toggleTierCollapse('bronze')}
                observations={groupedByTier.bronze}
                calculateDecayedConfidence={calculateDecayedConfidence}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                pool={activeTab as 'active' | 'context'}
              />
            )}
          </div>
        )}
      </main>

      {/* 操作指南对话框 */}
      {showGuide && <OperationGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}

interface TierSectionProps {
  tier: 'gold' | 'silver' | 'bronze';
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  observations: ObservationWithMetadata[];
  calculateDecayedConfidence: (obs: ObservationWithMetadata) => number;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  pool: 'active' | 'context';
}

function TierSection({
  tier,
  title,
  count,
  collapsed,
  onToggle,
  observations,
  calculateDecayedConfidence,
  selectedIds,
  onToggleSelection,
  pool,
}: TierSectionProps) {
  const tierColors = {
    gold: 'border-amber-500 bg-amber-500/5',
    silver: 'border-slate-400 bg-slate-400/5',
    bronze: 'border-slate-600 bg-slate-600/5',
  };

  return (
    <div className={`border-4 ${tierColors[tier]} p-4`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-xl font-black font-mono">{collapsed ? '▶' : '▼'}</span>
          <h3 className="text-xl font-black font-mono">{title}</h3>
          <span className="text-sm font-mono text-slate-400">({count})</span>
        </button>
      </div>

      {/* Observations List */}
      {!collapsed && (
        <div className="space-y-3">
          {observations.map((obs) => (
            <ObservationCard
              key={obs.id}
              observation={obs}
              decayedConfidence={calculateDecayedConfidence(obs)}
              isSelected={selectedIds.has(obs.id)}
              onToggleSelection={() => onToggleSelection(obs.id)}
              pool={pool}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ObservationCardProps {
  observation: ObservationWithMetadata;
  decayedConfidence: number;
  isSelected: boolean;
  onToggleSelection: () => void;
  pool: 'active' | 'context'; // 标识观察所在的池
}

function ObservationCard({
  observation,
  decayedConfidence,
  isSelected,
  onToggleSelection,
  pool,
}: ObservationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const decayPercent = ((observation.originalConfidence - decayedConfidence) / observation.originalConfidence) * 100;
  const hasSignificantDecay = decayPercent > 20;

  const handlePromote = async () => {
    try {
      await apiClient.promoteObservation(observation.id);
      toast.success('已提升到上下文');
      // WebSocket 会自动刷新，不需要手动刷新
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '提升失败');
    }
  };

  const handleIgnore = async () => {
    try {
      await apiClient.ignoreObservation(observation.id);
      toast.success('已标记为忽略并移至归档池');
      // WebSocket 会自动刷新，不需要手动刷新
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '操作失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此观察吗？删除后可在归档池中恢复。')) return;

    try {
      await apiClient.deleteObservation(observation.id);
      toast.success('已删除观察并移至归档池');
      // WebSocket 会自动刷新，不需要手动刷新
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  const handlePin = async () => {
    try {
      console.log('[Pin] Starting pin operation for:', observation.id);
      await apiClient.pinObservation(observation.id);
      console.log('[Pin] Pin API call successful');
      toast.success('已固定观察');
      // WebSocket 会自动刷新，不需要手动刷新
    } catch (err) {
      console.error('[Pin] Pin failed:', err);
      toast.error(err instanceof ApiError ? err.message : '固定失败');
    }
  };

  const handleUnpin = async () => {
    try {
      console.log('[Unpin] Starting unpin operation for:', observation.id);
      await apiClient.unpinObservation(observation.id);
      console.log('[Unpin] Unpin API call successful');
      toast.success('已取消固定');
      // WebSocket 会自动刷新，不需要手动刷新
    } catch (err) {
      console.error('[Unpin] Unpin failed:', err);
      toast.error(err instanceof ApiError ? err.message : '取消固定失败');
    }
  };

  const renderContent = () => {
    const { type, item } = observation;

    if (type === 'preference') {
      const pref = item as any;
      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-bold text-cyan-400">类型:</span>
            <span className="ml-2 text-sm">{pref.type}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-cyan-400">描述:</span>
            <p className="mt-1 text-sm text-slate-300">{pref.description}</p>
          </div>
        </div>
      );
    }

    if (type === 'pattern') {
      const pattern = item as any;
      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-bold text-cyan-400">问题:</span>
            <p className="mt-1 text-sm text-slate-300">{pattern.problem}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-cyan-400">解决方案:</span>
            <p className="mt-1 text-sm text-slate-300">{pattern.solution}</p>
          </div>
        </div>
      );
    }

    if (type === 'workflow') {
      const workflow = item as any;
      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs font-bold text-cyan-400">名称:</span>
            <span className="ml-2 text-sm">{workflow.name}</span>
          </div>
          {expanded && workflow.steps && (
            <div>
              <span className="text-xs font-bold text-cyan-400">步骤:</span>
              <ol className="mt-1 text-sm space-y-1 list-decimal list-inside text-slate-300">
                {workflow.steps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const typeLabels = {
    preference: '偏好',
    pattern: '模式',
    workflow: '工作流',
  };

  return (
    <div
      className={`border-2 p-4 relative transition-colors ${
        isSelected
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-slate-700 bg-slate-900'
      }`}
      data-testid="observation-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selection Checkbox */}
          <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggleSelection();
                }
              }}
              className="w-5 h-5 border-2 border-slate-600 bg-slate-800 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
              aria-label={`选择观察 ${observation.id}`}
              data-testid="observation-checkbox"
            />
          </label>

          <span className="px-2 py-1 text-xs font-bold border-2 border-cyan-500 text-cyan-400">
            {typeLabels[observation.type]}
          </span>
          <span className="text-xs text-slate-500 font-mono">ID: {observation.id.slice(0, 12)}...</span>

          {/* In Context Badge */}
          {observation.inContext && (
            <span className="px-2 py-1 text-xs font-bold bg-green-500/20 border border-green-500 text-green-400">
              已在上下文
            </span>
          )}

          {/* Manual Override Badge */}
          {observation.manualOverride && (
            <span className="px-2 py-1 text-xs font-bold bg-purple-500/20 border border-purple-500 text-purple-400">
              手动{observation.manualOverride.action === 'promote' ? '提升' : observation.manualOverride.action === 'ignore' ? '忽略' : '降级'}
            </span>
          )}

          {/* Pinned Badge */}
          {observation.pinned && (
            <span className="px-2 py-1 text-xs font-bold bg-amber-500/20 border border-amber-500 text-amber-400">
              📌 已固定
            </span>
          )}

          {/* Significant Decay Warning */}
          {hasSignificantDecay && (
            <span className="px-2 py-1 text-xs font-bold bg-orange-500/20 border border-orange-500 text-orange-400">
              ⚠ 显著衰减 ({decayPercent.toFixed(0)}%)
            </span>
          )}

          {/* Similarity Warning Badge */}
          {observation.similarToDeleted && (
            <span
              className="px-2 py-1 text-xs font-bold bg-red-500/20 border border-red-500 text-red-400"
              data-testid="similarity-warning"
            >
              ⚠️ 类似已删除观察
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Metadata */}
      <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-4 text-xs text-slate-400">
        {/* Confidence Display */}
        <div className="flex items-center gap-2">
          <span>置信度:</span>
          <span className={hasSignificantDecay ? 'text-orange-400' : 'text-green-400'}>
            {(observation.originalConfidence * 100).toFixed(0)}%
            {hasSignificantDecay && (
              <span className="ml-1">
                → {(decayedConfidence * 100).toFixed(0)}%
              </span>
            )}
          </span>
        </div>

        <div>提及: {observation.mentions} 次</div>
        <div>首次: {new Date(observation.firstSeen).toLocaleDateString()}</div>
        <div>最近: {new Date(observation.lastSeen).toLocaleDateString()}</div>

        {/* Evidence Toggle */}
        {observation.evidence.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-cyan-400 hover:text-cyan-300 font-mono"
          >
            {expanded ? '▼' : '▶'} 证据 ({observation.evidence.length})
          </button>
        )}

        {/* Merged From */}
        {observation.mergedFrom && observation.mergedFrom.length > 0 && (
          <div>
            合并自: {observation.mergedFrom.length} 个观察
          </div>
        )}
      </div>

      {/* Action Buttons Bar */}
      <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2">
        <button
          onClick={handlePromote}
          disabled={observation.inContext}
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↑ 提升
        </button>

        {/* Pin/Unpin button - only for Context Pool */}
        {pool === 'context' && (
          observation.pinned ? (
            <button
              onClick={handleUnpin}
              className="flex-1 px-3 py-2 text-sm font-mono border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors"
            >
              📌 取消固定
            </button>
          ) : (
            <button
              onClick={handlePin}
              className="flex-1 px-3 py-2 text-sm font-mono border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors"
            >
              📌 固定
            </button>
          )
        )}

        <button
          onClick={handleIgnore}
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-orange-500 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 transition-colors"
        >
          ⊘ 忽略
        </button>

        <button
          onClick={handleDelete}
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
        >
          × 删除
        </button>
      </div>

      {/* Similarity Warning Section */}
      {observation.similarToDeleted && (
        <div className="mt-3 p-3 border-2 border-red-500 bg-red-500/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-red-400">⚠️ 相似性警告</span>
                <span className="text-xs text-slate-400 font-mono">
                  相似度: {(observation.similarToDeleted.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-2">
                您在 {new Date(observation.similarToDeleted.deletedAt).toLocaleString()} 删除过类似的观察
                （ID: {observation.similarToDeleted.deletedId.slice(0, 12)}...）
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    if (confirm('确定再次删除此观察吗？')) {
                      await handleDelete();
                    }
                  }}
                  className="text-xs px-3 py-1 border border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-mono transition-colors"
                >
                  再次删除
                </button>
                <button
                  onClick={async () => {
                    // 清除相似性警告（通过重新保存观察但不带 similarToDeleted 字段）
                    toast.info('已保留此观察');
                  }}
                  className="text-xs px-3 py-1 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
                >
                  这次保留
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence List (Collapsible) */}
      {expanded && observation.evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs font-bold text-cyan-400 mb-2">📌 证据引用:</div>
          <ul className="space-y-1 text-xs text-slate-400">
            {observation.evidence.slice(0, 3).map((evidence, idx) => (
              <li key={idx} className="font-mono">
                {idx + 1}. {evidence}
              </li>
            ))}
            {observation.evidence.length > 3 && (
              <li className="text-slate-500">
                ... 还有 {observation.evidence.length - 3} 条证据
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
