import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Toast from '../components/Toast';

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-amber-500 text-xl font-mono">加载中</div>
        <div className="mt-4 flex gap-2 justify-center">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Shared Navigation Header */}
      <header className="border-b-4 border-amber-500 bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-3xl font-black text-amber-500 tracking-tight"
                style={{ fontFamily: '"Noto Sans SC", "Archivo Black", sans-serif' }}
              >
                CLAUDE 进化系统
              </h1>
              <p className="text-sm text-slate-400 font-mono mt-1">AI 学习系统监控平台</p>
            </div>
            <Navigation />
          </div>
        </div>
      </header>

      {/* Page Content */}
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>

      <Toast />
    </div>
  );
}
