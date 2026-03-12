import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;
let listeners: Array<(messages: ToastMessage[]) => void> = [];
let messages: ToastMessage[] = [];

/**
 * Toast 管理器（单例模式）
 */
export const toast = {
  success(message: string) {
    this.show(message, 'success');
  },

  error(message: string) {
    this.show(message, 'error');
  },

  info(message: string) {
    this.show(message, 'info');
  },

  warning(message: string) {
    this.show(message, 'warning');
  },

  show(message: string, type: ToastType = 'info') {
    const id = `toast-${++toastIdCounter}`;
    const newMessage: ToastMessage = { id, type, message };

    messages = [...messages, newMessage];
    this.notify();

    // 3 秒后自动移除
    setTimeout(() => {
      this.remove(id);
    }, 3000);
  },

  remove(id: string) {
    messages = messages.filter((m) => m.id !== id);
    this.notify();
  },

  subscribe(listener: (messages: ToastMessage[]) => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  notify() {
    listeners.forEach((listener) => listener(messages));
  },
};

/**
 * Toast 容器组件
 */
export default function Toast() {
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToastMessages);
    return unsubscribe;
  }, []);

  if (toastMessages.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastMessages.map((msg) => (
        <ToastItem
          key={msg.id}
          message={msg}
          onClose={() => toast.remove(msg.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  message: ToastMessage;
  onClose: () => void;
}

function ToastItem({ message, onClose }: ToastItemProps) {
  const typeStyles = {
    success: 'bg-green-900 border-green-500 text-green-100',
    error: 'bg-red-900 border-red-500 text-red-100',
    info: 'bg-blue-900 border-blue-500 text-blue-100',
    warning: 'bg-yellow-900 border-yellow-500 text-yellow-100',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`
        ${typeStyles[message.type]}
        border-4 px-4 py-3 pr-10
        min-w-[300px] max-w-[500px]
        font-mono text-sm
        animate-[slideInRight_0.3s_ease-out]
        relative
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{icons[message.type]}</span>
        <p className="flex-1">{message.message}</p>
      </div>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-xl hover:opacity-70 transition-opacity"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
}
