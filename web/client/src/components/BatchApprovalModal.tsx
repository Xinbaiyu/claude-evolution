import { useState, useEffect } from 'react';

type ModalState = 'idle' | 'processing' | 'success' | 'error';

interface BatchApprovalModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  errorMessage?: string;
  onSuccess?: () => void;
}

export default function BatchApprovalModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
  errorMessage,
  onSuccess,
}: BatchApprovalModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [error, setError] = useState<string>('');

  // 6.4: 重置状态到 idle when Modal 重新打开
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 6.1: 使用 try-catch 包裹异步逻辑
  const handleConfirm = async () => {
    setState('processing');
    try {
      await onConfirm();
      // 6.2: 成功时设置状态
      setState('success');
    } catch (err) {
      // 6.3: 失败时设置状态和错误信息
      setError(err instanceof Error ? err.message : '批准失败');
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      {/* idle 状态：确认对话框 */}
      {state === 'idle' && (
        <div className="border-4 border-amber-500 bg-slate-900 p-8 max-w-md w-full">
          <h2
            className="text-2xl font-black text-amber-500 mb-4"
            style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
          >
            确认批准
          </h2>
          <p className="text-slate-300 font-mono mb-6">
            确认批准 {selectedCount} 条建议？
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-mono font-bold py-3 px-6 transition-colors"
            >
              确认批准
            </button>
            <button
              onClick={onClose}
              className="flex-1 border-2 border-slate-600 hover:bg-slate-600/20 text-slate-300 font-mono font-bold py-3 px-6 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* processing 状态：处理中 */}
      {state === 'processing' && (
        <div className="border-4 border-amber-500 bg-slate-900 p-8 max-w-md w-full">
          <div className="text-center">
            {/* Spinner */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2
              className="text-xl font-black text-amber-500 mb-2"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              正在批准 {selectedCount} 条建议...
            </h2>
            <p className="text-slate-400 text-sm font-mono mt-4">
              请勿关闭浏览器
            </p>
          </div>
        </div>
      )}

      {/* success 状态：成功 */}
      {state === 'success' && (
        <div className="border-4 border-green-500 bg-slate-900 p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2
              className="text-2xl font-black text-green-400 mb-4"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              批准成功
            </h2>
            <p className="text-slate-300 font-mono mb-6">
              已批准 {selectedCount} 条建议
            </p>
            <button
              onClick={() => {
                if (onSuccess) onSuccess();
                onClose();
              }}
              className="w-full border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono font-bold py-3 px-6 transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* error 状态：错误 */}
      {state === 'error' && (
        <div className="border-4 border-red-500 bg-slate-900 p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">✕</div>
            <h2
              className="text-2xl font-black text-red-400 mb-4"
              style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
            >
              批准失败
            </h2>
            <p className="text-slate-300 font-mono mb-6">
              {errorMessage || error || '批准过程中发生错误'}
            </p>

            {/* 回滚提示框 */}
            <div className="border-2 border-red-500 bg-red-500/10 p-4 mb-6">
              <p className="text-red-400 font-bold font-mono">
                ⚠️ 所有更改已回滚
              </p>
              <p className="text-sm text-slate-400 font-mono mt-1">
                未应用任何建议
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold py-3 px-6 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
