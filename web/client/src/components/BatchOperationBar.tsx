/**
 * 批量操作工具栏组件
 * 当有观察被选中时显示，提供批量操作按钮
 */

interface BatchOperationBarProps {
  selectedCount: number;
  hiddenCount: number;
  onPromote: () => void;
  onIgnore: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  pool?: 'active' | 'context'; // 当前所在池
  onPin?: () => void; // Pin 操作 (仅 Context Pool)
  onUnpin?: () => void; // Unpin 操作 (仅 Context Pool)
}

export default function BatchOperationBar({
  selectedCount,
  hiddenCount,
  onPromote,
  onIgnore,
  onDelete,
  onClearSelection,
  pool,
  onPin,
  onUnpin,
}: BatchOperationBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="sticky top-[73px] z-40 bg-amber-500/20 border-4 border-amber-500 p-4 mb-6 backdrop-blur-sm"
      data-testid="batch-operation-bar"
    >
      <div className="flex items-center justify-between">
        {/* 选中计数 */}
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold font-mono text-amber-500" data-testid="selection-count">
            ✓ {selectedCount} 已选
            {hiddenCount > 0 && (
              <span className="text-sm text-slate-400 ml-2">
                ({hiddenCount} 项被过滤器隐藏)
              </span>
            )}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPromote}
            className="border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-mono font-bold py-2 px-4 transition-colors"
            data-testid="batch-promote-btn"
          >
            ⬆️ 批量提升
          </button>

          {/* Pin/Unpin buttons - only show for Context Pool */}
          {pool === 'context' && onPin && (
            <button
              onClick={onPin}
              className="border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-2 px-4 transition-colors"
              data-testid="batch-pin-btn"
            >
              📌 批量固定
            </button>
          )}

          {pool === 'context' && onUnpin && (
            <button
              onClick={onUnpin}
              className="border-2 border-slate-500 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 font-mono font-bold py-2 px-4 transition-colors"
              data-testid="batch-unpin-btn"
            >
              📌 批量取消固定
            </button>
          )}

          <button
            onClick={onIgnore}
            className="border-2 border-orange-500 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 font-mono font-bold py-2 px-4 transition-colors"
            data-testid="batch-ignore-btn"
          >
            🔕 批量忽略
          </button>

          <button
            onClick={onDelete}
            className="border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-mono font-bold py-2 px-4 transition-colors"
            data-testid="batch-delete-btn"
          >
            🗑️ 批量删除
          </button>

          <div className="h-8 w-px bg-slate-600"></div>

          <button
            onClick={onClearSelection}
            className="border-2 border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono font-bold py-2 px-4 transition-colors"
            data-testid="clear-selection-btn"
          >
            ✕ 清除选择
          </button>
        </div>
      </div>
    </div>
  );
}
