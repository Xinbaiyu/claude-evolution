import { useEffect, useState } from 'react';
import { apiClient, type Config, type LearningStats } from '../../api/client';

interface LearningTabProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export default function LearningTab({ config, onConfigChange }: LearningTabProps) {
  const [stats, setStats] = useState<LearningStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiClient.getLearningStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load learning stats:', error);
      // 不显示错误，因为这可能在学习系统未启用时发生
    }
  };

  // 如果学习系统未配置，显示提示
  if (!config.learning) {
    return (
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <div className="text-center py-12">
          <div className="text-amber-500 text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">增量学习系统未启用</h3>
          <p className="text-sm text-slate-500">
            该系统需要在配置文件中启用 learning 配置项。
          </p>
        </div>
      </div>
    );
  }

  const learning = config.learning;

  const updateLearning = (updates: Partial<typeof learning>) => {
    onConfigChange({
      ...config,
      learning: {
        ...learning,
        ...updates,
      },
    });
  };

  // 计算池容量进度
  const activeSize = stats?.summary.activeObservations || 0;
  const contextSize = stats?.summary.contextObservations || 0;

  // 处理新旧配置结构兼容性
  const activeCap = learning.capacity?.active || {
    targetSize: (learning.capacity as any)?.targetSize || 30,
    maxSize: (learning.capacity as any)?.maxSize || 50,
    minSize: (learning.capacity as any)?.minSize || 10,
  };
  const contextCap = learning.capacity?.context;

  const targetSize = activeCap.targetSize;
  const maxSize = activeCap.maxSize;
  const activeProgress = (activeSize / maxSize) * 100;

  // Context Pool progress
  const contextTargetSize = contextCap?.targetSize || 50;
  const contextMaxSize = contextCap?.maxSize || 80;
  const contextProgress = (contextSize / contextMaxSize) * 100;
  const pinnedCount = stats?.pools.context ?
    (stats.pools.context as any).pinnedCount || 0 : 0;

  return (
    <div className="space-y-6">
      {/* 池统计概览 */}
      {stats && (
        <div className="border-4 border-cyan-500/30 bg-cyan-500/5 p-6">
          <h3 className="text-lg font-black text-cyan-400 mb-4 font-mono">观察池统计</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Active Pool */}
            <div className="border-2 border-slate-600 bg-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">活跃池 (Active)</div>
              <div className="text-3xl font-black text-amber-500 mb-2">
                {stats.summary.activeObservations}
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all ${
                    activeProgress > 100 ? 'bg-red-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(activeProgress, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                目标: {targetSize} / 上限: {maxSize}
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-amber-400">🥇 Gold:</span>
                  <span className="text-slate-300">{stats.pools.active.tiers.gold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">🥈 Silver:</span>
                  <span className="text-slate-300">{stats.pools.active.tiers.silver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">🥉 Bronze:</span>
                  <span className="text-slate-300">{stats.pools.active.tiers.bronze}</span>
                </div>
              </div>
            </div>

            {/* Context Pool */}
            <div className="border-2 border-slate-600 bg-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">上下文池 (Context)</div>
              <div className="text-3xl font-black text-green-500 mb-2">
                {stats.summary.contextObservations}
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all ${
                    contextProgress > 100 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(contextProgress, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                目标: {contextTargetSize} / 上限: {contextMaxSize}
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-400">手动提升:</span>
                  <span className="text-slate-300">
                    {stats.pools.context.manualOverrides.promoted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">📌 已固定:</span>
                  <span className="text-slate-300">{pinnedCount}</span>
                </div>
              </div>
            </div>

            {/* Archived Pool */}
            <div className="border-2 border-slate-600 bg-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">归档池 (Archived)</div>
              <div className="text-3xl font-black text-slate-500 mb-2">
                {stats.summary.archivedObservations}
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-slate-500 w-0" />
              </div>
              <div className="text-xs text-slate-500">
                保留 {learning.retention.archivedDays} 天
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 容量配置 */}
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-black text-amber-500 mb-4 font-mono">容量控制</h3>
        <div className="space-y-6">
          {/* Target Size Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-slate-300">候选池大小</div>
                <div className="text-xs text-slate-500">
                  活跃池的目标观察数量（{activeCap.minSize} - {activeCap.maxSize}）
                </div>
              </div>
              <div className="text-2xl font-black text-amber-500 font-mono">
                {activeCap.targetSize}
              </div>
            </div>
            <input
              type="range"
              min={activeCap.minSize}
              max={activeCap.maxSize}
              step="5"
              value={activeCap.targetSize}
              onChange={(e) =>
                updateLearning({
                  capacity: {
                    ...learning.capacity,
                    active: {
                      ...activeCap,
                      targetSize: parseInt(e.target.value),
                    },
                  },
                })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>最小: {activeCap.minSize}</span>
              <span>最大: {activeCap.maxSize}</span>
            </div>
          </div>

          {/* Capacity Limits Display */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border-2 border-slate-600 bg-slate-800 p-3">
              <div className="text-xs text-slate-400">最小值 (minSize)</div>
              <div className="text-xl font-bold text-slate-300 mt-1">
                {activeCap.minSize}
              </div>
            </div>
            <div className="border-2 border-amber-600 bg-amber-500/10 p-3">
              <div className="text-xs text-amber-400">目标值 (targetSize)</div>
              <div className="text-xl font-bold text-amber-500 mt-1">
                {activeCap.targetSize}
              </div>
            </div>
            <div className="border-2 border-red-600 bg-red-500/10 p-3">
              <div className="text-xs text-red-400">上限值 (maxSize)</div>
              <div className="text-xl font-bold text-red-500 mt-1">
                {activeCap.maxSize}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Pool 容量配置 */}
      {contextCap && (
        <div className="border-4 border-green-500/30 bg-green-500/5 p-6">
          <h3 className="text-xl font-black text-green-500 mb-4 font-mono">上下文池容量管理</h3>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4 mb-6">
            <div>
              <div className="text-sm font-bold text-slate-300">启用容量管理</div>
              <div className="text-xs text-slate-500">
                自动控制上下文池大小,防止 CLAUDE.md 过大
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={contextCap.enabled}
                onChange={(e) =>
                  updateLearning({
                    capacity: {
                      ...learning.capacity,
                      context: {
                        ...contextCap,
                        enabled: e.target.checked,
                      },
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {contextCap.enabled && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="border-2 border-slate-600 bg-slate-800 p-4 rounded">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-slate-300">当前状态</div>
                  <div className={`px-3 py-1 text-xs font-bold rounded ${
                    contextSize > contextMaxSize
                      ? 'bg-red-500/20 border border-red-500 text-red-400'
                      : contextSize > contextTargetSize
                      ? 'bg-orange-500/20 border border-orange-500 text-orange-400'
                      : 'bg-green-500/20 border border-green-500 text-green-400'
                  }`}>
                    {contextSize > contextMaxSize
                      ? '⚠️ 超出上限'
                      : contextSize > contextTargetSize
                      ? '接近上限'
                      : '✓ 正常'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">当前数量</div>
                    <div className="text-2xl font-bold text-green-500 mt-1">{contextSize}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">固定数量</div>
                    <div className="text-2xl font-bold text-amber-500 mt-1">{pinnedCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">利用率</div>
                    <div className="text-2xl font-bold text-cyan-500 mt-1">
                      {contextMaxSize > 0 ? Math.round((contextSize / contextMaxSize) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-300">目标大小 (targetSize)</div>
                    <div className="text-xs text-slate-500">
                      超过此值时触发容量管理
                    </div>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={contextTargetSize}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 10;
                      updateLearning({
                        capacity: {
                          ...learning.capacity,
                          context: {
                            ...contextCap,
                            targetSize: Math.min(Math.max(value, 10), contextMaxSize),
                          },
                        },
                      });
                    }}
                    className="w-24 px-3 py-2 bg-slate-800 border-2 border-slate-600 text-slate-100 font-mono text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Max Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-300">最大值 (maxSize)</div>
                    <div className="text-xs text-slate-500">
                      绝对上限,必须 ≥ 目标大小
                    </div>
                  </div>
                  <input
                    type="number"
                    min={contextTargetSize}
                    max="250"
                    value={contextMaxSize}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || contextTargetSize;
                      updateLearning({
                        capacity: {
                          ...learning.capacity,
                          context: {
                            ...contextCap,
                            maxSize: Math.max(value, contextTargetSize),
                          },
                        },
                      });
                    }}
                    className="w-24 px-3 py-2 bg-slate-800 border-2 border-slate-600 text-slate-100 font-mono text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Half Life Days */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-300">记忆半衰期 (halfLifeDays)</div>
                    <div className="text-xs text-slate-500">
                      计算观察重要性得分的时间衰减参数
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="30"
                      max="180"
                      value={contextCap.halfLifeDays}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 90;
                        updateLearning({
                          capacity: {
                            ...learning.capacity,
                            context: {
                              ...contextCap,
                              halfLifeDays: Math.min(Math.max(value, 30), 180),
                            },
                          },
                        });
                      }}
                      className="w-24 px-3 py-2 bg-slate-800 border-2 border-slate-600 text-slate-100 font-mono text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-sm text-slate-400">天</span>
                  </div>
                </div>
              </div>

              {/* Warning for targetSize > maxSize */}
              {contextTargetSize > contextMaxSize && (
                <div className="border-2 border-red-500 bg-red-500/10 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="text-sm font-bold text-red-400 mb-1">配置错误</div>
                      <div className="text-xs text-slate-300">
                        目标大小 ({contextTargetSize}) 不能大于最大值 ({contextMaxSize})。
                        保存时将自动修正为: targetSize = maxSize = {contextMaxSize}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info about pinned observations */}
              {pinnedCount > 20 && (
                <div className="border-2 border-amber-500 bg-amber-500/10 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <div className="text-sm font-bold text-amber-400 mb-1">提示</div>
                      <div className="text-xs text-slate-300">
                        您已固定 {pinnedCount} 个观察。固定的观察不会被容量管理清理,
                        但过多固定可能影响容量管理效率。建议定期审查是否需要取消固定旧观察。
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 时间衰减配置 */}
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-black text-amber-500 mb-4 font-mono">时间衰减</h3>
        <div className="space-y-4">
          {/* Enable Decay Toggle */}
          <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4">
            <div>
              <div className="text-sm font-bold text-slate-300">启用时间衰减</div>
              <div className="text-xs text-slate-500">
                根据时间自动降低观察的置信度
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={learning.decay.enabled}
                onChange={(e) =>
                  updateLearning({
                    decay: {
                      ...learning.decay,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Half-Life Slider */}
          {learning.decay.enabled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-bold text-slate-300">记忆半衰期</div>
                  <div className="text-xs text-slate-500">
                    置信度衰减到一半所需的天数（7-90 天）
                  </div>
                </div>
                <div className="text-2xl font-black text-cyan-500 font-mono">
                  {learning.decay.halfLifeDays} 天
                </div>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={learning.decay.halfLifeDays}
                onChange={(e) =>
                  updateLearning({
                    decay: {
                      ...learning.decay,
                      halfLifeDays: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>7 天（快速遗忘）</span>
                <span>90 天（长期记忆）</span>
              </div>

              {/* Decay Explanation */}
              <div className="mt-4 border-2 border-cyan-500/20 bg-cyan-500/5 p-3">
                <div className="text-xs text-cyan-400 space-y-1">
                  <p>
                    <strong>当前设置：</strong>
                    {learning.decay.halfLifeDays} 天后，观察的置信度会衰减到原始值的 50%
                  </p>
                  <p className="text-slate-500">
                    例如：90% 置信度的观察，在 {learning.decay.halfLifeDays} 天后会降至 45%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提升阈值配置 */}
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-black text-amber-500 mb-4 font-mono">自动提升阈值</h3>
        <div className="space-y-4">
          <div className="text-xs text-slate-400 mb-4">
            观察同时满足置信度和提及次数阈值时，自动提升到上下文池
          </div>

          {/* Auto Promotion */}
          <div className="border-2 border-green-500/30 bg-green-500/5 p-4">
            <div className="text-sm font-bold text-green-400 mb-3">🥇 自动提升（Gold）</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">置信度阈值</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={learning.promotion.autoConfidence}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        autoConfidence: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">提及次数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={learning.promotion.autoMentions}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        autoMentions: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="border-2 border-amber-500/30 bg-amber-500/5 p-4">
            <div className="text-sm font-bold text-amber-400 mb-3">🥈 高优先级（Silver）</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">置信度阈值</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={learning.promotion.highConfidence}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        highConfidence: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">提及次数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={learning.promotion.highMentions}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        highMentions: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
            </div>
          </div>

          {/* Candidate */}
          <div className="border-2 border-slate-500/30 bg-slate-500/5 p-4">
            <div className="text-sm font-bold text-slate-400 mb-3">🥉 候选（Bronze）</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">置信度阈值</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={learning.promotion.candidateConfidence}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        candidateConfidence: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">提及次数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={learning.promotion.candidateMentions}
                  onChange={(e) =>
                    updateLearning({
                      promotion: {
                        ...learning.promotion,
                        candidateMentions: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-3"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 删除阈值配置 */}
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-black text-amber-500 mb-4 font-mono">删除阈值</h3>
        <div className="space-y-4">
          <div className="text-xs text-slate-400 mb-4">
            观察的置信度低于阈值时，会被自动删除或延迟删除
          </div>

          {/* Immediate Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-slate-300">立即删除阈值</div>
                <div className="text-xs text-slate-500">
                  置信度低于此值的观察会立即删除
                </div>
              </div>
              <div className="text-xl font-black text-red-500 font-mono">
                {(learning.deletion.immediateThreshold * 100).toFixed(0)}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={learning.deletion.immediateThreshold}
              onChange={(e) =>
                updateLearning({
                  deletion: {
                    ...learning.deletion,
                    immediateThreshold: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          {/* Delayed Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-bold text-slate-300">延迟删除阈值</div>
                <div className="text-xs text-slate-500">
                  置信度低于此值且长时间未提及会延迟删除
                </div>
              </div>
              <div className="text-xl font-black text-orange-500 font-mono">
                {(learning.deletion.delayedThreshold * 100).toFixed(0)}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={learning.deletion.delayedThreshold}
              onChange={(e) =>
                updateLearning({
                  deletion: {
                    ...learning.deletion,
                    delayedThreshold: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          {/* Delayed Days */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-300">延迟删除等待天数</div>
              <div className="text-xs text-slate-500">
                在延迟阈值下未增长的等待天数（1-90 天）
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="90"
              value={learning.deletion.delayedDays}
              onChange={(e) =>
                updateLearning({
                  deletion: {
                    ...learning.deletion,
                    delayedDays: parseInt(e.target.value),
                  },
                })
              }
              className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4 w-24"
            />
          </div>
        </div>
      </div>

      {/* 归档保留配置 */}
      <div className="border-4 border-slate-700 bg-slate-900 p-6">
        <h3 className="text-xl font-black text-amber-500 mb-4 font-mono">归档保留</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-300">归档保留天数</div>
            <div className="text-xs text-slate-500">
              归档的观察会保留指定天数后永久删除（7-365 天）
            </div>
          </div>
          <input
            type="number"
            min="7"
            max="365"
            value={learning.retention.archivedDays}
            onChange={(e) =>
              updateLearning({
                retention: {
                  archivedDays: parseInt(e.target.value),
                },
              })
            }
            className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4 w-24"
          />
        </div>
      </div>
    </div>
  );
}
