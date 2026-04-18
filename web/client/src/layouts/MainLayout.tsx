import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Toast from '../components/Toast';
import VersionUpdateModal from '../components/VersionUpdateModal';
import { apiClient } from '../api/client';

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
  const [versionUpdateVisible, setVersionUpdateVisible] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    currentVersion: string;
    latestVersion: string;
  } | null>(null);

  // 页面加载时检查版本更新
  useEffect(() => {
    const checkVersionUpdate = async () => {
      try {
        const result = await apiClient.getVersionUpdate();

        // 如果有更新且需要通知，显示弹窗
        if (result.hasUpdate && result.needsNotify) {
          setVersionInfo({
            currentVersion: result.currentVersion,
            latestVersion: result.latestVersion,
          });
          setVersionUpdateVisible(true);
        }
      } catch (error) {
        // 静默失败，不影响用户体验
        console.error('[版本检查] 检查失败:', error);
      }
    };

    checkVersionUpdate();
  }, []);

  const handleVersionUpdateClose = async () => {
    // 标记为已读
    if (versionInfo) {
      try {
        await apiClient.markVersionAsRead(versionInfo.latestVersion);
      } catch (error) {
        console.error('[版本检查] 标记已读失败:', error);
      }
    }
    setVersionUpdateVisible(false);
  };

  const handleVersionUpgrade = async () => {
    try {
      const result = await apiClient.upgradeVersion();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '升级失败',
      };
    }
  };

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

      {/* Version Update Modal */}
      {versionInfo && (
        <VersionUpdateModal
          visible={versionUpdateVisible}
          currentVersion={versionInfo.currentVersion}
          latestVersion={versionInfo.latestVersion}
          onClose={handleVersionUpdateClose}
          onUpgrade={handleVersionUpgrade}
        />
      )}
    </div>
  );
}
