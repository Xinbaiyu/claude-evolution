/**
 * 操作指南组件 - 解释学习系统中的各种操作
 */

import { useState } from 'react';

interface OperationGuideProps {
  onClose: () => void;
}

export default function OperationGuide({ onClose }: OperationGuideProps) {
  const [activeTab, setActiveTab] = useState<'operations' | 'lifecycle'>('operations');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-cyan-500 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b-4 border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-cyan-400 font-mono">
            📚 操作指南
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold px-3 py-1 border-2 border-slate-600 hover:border-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b-4 border-slate-700 flex">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex-1 py-3 px-4 font-mono font-bold transition-colors ${
              activeTab === 'operations'
                ? 'bg-cyan-500/20 border-b-4 border-cyan-500 text-cyan-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            操作说明
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`flex-1 py-3 px-4 font-mono font-bold transition-colors ${
              activeTab === 'lifecycle'
                ? 'bg-cyan-500/20 border-b-4 border-cyan-500 text-cyan-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            生命周期
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'operations' && (
            <>
              {/* 提升操作 */}
              <div className="border-4 border-green-500/30 bg-green-500/5 p-4">
                <h3 className="text-xl font-black text-green-400 mb-3 font-mono flex items-center gap-2">
                  <span>↑</span>
                  <span>提升到上下文（Promote）</span>
                </h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p><strong className="text-green-400">作用：</strong>将观察从活跃池移动到上下文池，使其进入 CLAUDE.md 文档</p>
                  <p><strong className="text-green-400">影响：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li>观察会被写入 CLAUDE.md，成为 AI 的持久记忆</li>
                    <li><strong className="text-amber-400">仍然受时间衰退影响</strong>（衰退分数用于容量控制评分）</li>
                    <li>会占用上下文池容量，可能触发容量控制</li>
                    <li>可以被固定（pin）以防止容量清理</li>
                  </ul>
                  <p><strong className="text-green-400">何时使用：</strong>对于确认有价值的偏好、模式和工作流</p>
                </div>
              </div>

              {/* 固定操作 */}
              <div className="border-4 border-amber-500/30 bg-amber-500/5 p-4">
                <h3 className="text-xl font-black text-amber-400 mb-3 font-mono flex items-center gap-2">
                  <span>📌</span>
                  <span>固定观察（Pin）</span>
                </h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p><strong className="text-amber-400">作用：</strong>保护上下文池中的重要观察，防止被自动清理</p>
                  <p><strong className="text-amber-400">影响：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li>固定的观察不会被容量控制机制清理</li>
                    <li>仍然会显示在 CLAUDE.md 中</li>
                    <li><strong className="text-amber-400">仍然受时间衰退影响</strong>（但不会因低分被清理）</li>
                    <li>可以随时取消固定</li>
                  </ul>
                  <p><strong className="text-amber-400">注意：</strong>固定过多观察（20+）会收到警告，建议定期审查</p>
                  <p><strong className="text-amber-400">何时使用：</strong>核心偏好、关键模式、重要工作流</p>
                </div>
              </div>

              {/* 忽略操作 */}
              <div className="border-4 border-orange-500/30 bg-orange-500/5 p-4">
                <h3 className="text-xl font-black text-orange-400 mb-3 font-mono flex items-center gap-2">
                  <span>⊘</span>
                  <span>忽略观察（Ignore）</span>
                </h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p><strong className="text-orange-400">作用：</strong>将观察移动到归档池，不再显示在活跃或上下文池中</p>
                  <p><strong className="text-orange-400">影响：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li>观察立即从当前池移除</li>
                    <li>如果在上下文池，会从 CLAUDE.md 中移除</li>
                    <li>移动到归档池，标记为"用户忽略"</li>
                    <li>不会被自动删除，可以随时恢复</li>
                    <li>类似的新观察可能会被自动抑制（相似度检测）</li>
                  </ul>
                  <p><strong className="text-orange-400">可恢复：</strong>可在归档页面恢复到活跃池或上下文池</p>
                  <p><strong className="text-orange-400">何时使用：</strong>误报、不相关或过时的观察</p>
                </div>
              </div>

              {/* 删除操作 */}
              <div className="border-4 border-red-500/30 bg-red-500/5 p-4">
                <h3 className="text-xl font-black text-red-400 mb-3 font-mono flex items-center gap-2">
                  <span>×</span>
                  <span>删除观察（Delete）</span>
                </h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p><strong className="text-red-400">作用：</strong>将观察移动到归档池，标记为"用户删除"</p>
                  <p><strong className="text-red-400">影响：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li>观察立即从当前池移除</li>
                    <li>如果在上下文池，会从 CLAUDE.md 中移除</li>
                    <li>移动到归档池，保留一定时间后才会被永久删除</li>
                    <li>在归档期内可以恢复</li>
                    <li>类似的新观察会显示相似性警告</li>
                  </ul>
                  <p><strong className="text-red-400">可恢复：</strong>在归档保留期内可恢复（默认 30 天）</p>
                  <p><strong className="text-red-400">何时使用：</strong>完全不需要的观察</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'lifecycle' && (
            <>
              {/* 观察生命周期 */}
              <div className="border-4 border-cyan-500/30 bg-cyan-500/5 p-4">
                <h3 className="text-xl font-black text-cyan-400 mb-3 font-mono">
                  🔄 观察生命周期
                </h3>
                <div className="space-y-3 text-slate-300 text-sm">
                  <div className="bg-slate-800 border-2 border-slate-600 p-3">
                    <div className="font-bold text-cyan-400 mb-2">1. 活跃池（Active Pool）</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                      <li>新观察的初始位置</li>
                      <li>受时间衰退影响（置信度随时间降低）</li>
                      <li>达到阈值自动提升到上下文池（Gold 层级）</li>
                      <li>容量超限时低分观察被归档</li>
                    </ul>
                  </div>

                  <div className="text-center text-2xl text-slate-500">↓</div>

                  <div className="bg-slate-800 border-2 border-slate-600 p-3">
                    <div className="font-bold text-green-400 mb-2">2. 上下文池（Context Pool）</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                      <li>高价值观察的位置</li>
                      <li><strong className="text-amber-400">仍受时间衰退影响</strong>（用于容量控制评分）</li>
                      <li>写入 CLAUDE.md，AI 可直接访问</li>
                      <li>容量超限时低分未固定观察被归档</li>
                      <li>可固定以永久保留</li>
                    </ul>
                  </div>

                  <div className="text-center text-2xl text-slate-500">↓</div>

                  <div className="bg-slate-800 border-2 border-slate-600 p-3">
                    <div className="font-bold text-purple-400 mb-2">3. 归档池（Archive Pool）</div>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-400">
                      <li>已忽略、已删除或容量清理的观察</li>
                      <li>保留一定时间（默认 30 天）</li>
                      <li>可以恢复到活跃池或上下文池</li>
                      <li>过期后永久删除</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 时间衰退 */}
              <div className="border-4 border-blue-500/30 bg-blue-500/5 p-4">
                <h3 className="text-xl font-black text-blue-400 mb-3 font-mono">
                  ⏱️ 时间衰退（Temporal Decay）
                </h3>
                <div className="space-y-2 text-slate-300 text-sm">
                  <p><strong className="text-blue-400">衰退公式：</strong>衰减后置信度 = 原始置信度 × 0.5^(天数/半衰期)</p>
                  <p><strong className="text-blue-400">各池衰退：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li><strong className="text-cyan-400">活跃池：</strong>半衰期约 30 天，衰退较快</li>
                    <li><strong className="text-green-400">上下文池：</strong>半衰期约 90 天，衰退较慢（用于容量控制评分）</li>
                    <li><strong className="text-purple-400">归档池：</strong>不受影响</li>
                  </ul>
                  <p className="text-slate-400">低于阈值的观察可能被自动清理</p>
                </div>
              </div>

              {/* 自动清理 */}
              <div className="border-4 border-rose-500/30 bg-rose-500/5 p-4">
                <h3 className="text-xl font-black text-rose-400 mb-3 font-mono">
                  🗑️ 自动清理规则
                </h3>
                <div className="space-y-3 text-slate-300 text-sm">
                  <div>
                    <p className="font-bold text-rose-400 mb-2">活跃池容量控制：</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                      <li>超过最大容量时，低分观察被归档</li>
                      <li>目标容量 ≤ 实际容量 ≤ 最大容量</li>
                      <li>评分综合：置信度、提及次数、时间衰退</li>
                      <li>归档原因：active_capacity</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-rose-400 mb-2">上下文池容量控制：</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                      <li>超过最大容量时，低分未固定观察被归档</li>
                      <li>固定（pinned）的观察不会被清理</li>
                      <li>评分综合：置信度、提及次数、最近访问时间</li>
                      <li>归档原因：context_capacity</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-rose-400 mb-2">归档池过期清理：</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                      <li>保留期：默认 30 天</li>
                      <li>超过保留期的观察会被永久删除</li>
                      <li>删除前无法恢复</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-4 border-slate-700 p-4 bg-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              💡 提示：合理使用这些操作可以让学习系统更好地理解你的偏好
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-mono font-bold transition-colors border-2 border-cyan-400"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
