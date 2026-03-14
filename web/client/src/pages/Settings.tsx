import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { toast } from '../components/Toast';

export default function Settings() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await apiClient.getConfig();
      setConfig(data);
    } catch (error) {
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateConfig(config);
      toast.success('配置已保存');
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 text-xl font-mono">加载配置中...</div>
      </div>
    );
  }

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
                系统设置
              </h1>
              <p className="text-sm text-slate-400 font-mono mt-1">配置调度器、LLM 和通知</p>
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
                className="px-4 py-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 font-mono font-semibold rounded transition-colors border border-transparent hover:border-amber-500/30"
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
                className="px-4 py-2 text-amber-500 bg-amber-500/10 font-mono font-semibold rounded border border-amber-500/30"
              >
                系统设置
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* 调度器配置 */}
          <div className="border-4 border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-black text-amber-500 mb-4 font-mono">调度器</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-300">启用调度器</div>
                  <div className="text-xs text-slate-500">自动定时分析代码库</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.scheduler.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        scheduler: { ...config.scheduler, enabled: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-300">分析间隔</div>
                  <div className="text-xs text-slate-500">定时分析的时间间隔</div>
                </div>
                <select
                  value={config.scheduler.interval}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      scheduler: { ...config.scheduler, interval: e.target.value },
                    })
                  }
                  disabled={!config.scheduler.enabled}
                  className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4 disabled:opacity-50"
                >
                  <option value="6h">每 6 小时</option>
                  <option value="12h">每 12 小时</option>
                  <option value="24h">每 24 小时</option>
                </select>
              </div>
            </div>
          </div>

          {/* LLM 配置 */}
          <div className="border-4 border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-black text-amber-500 mb-4 font-mono">Claude 模型</h2>

            {/* API Key 提示 */}
            <div className="mb-6 border-2 border-cyan-500/30 bg-cyan-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="text-cyan-500 text-xl">🔑</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-cyan-400 mb-1">API Key 配置</div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>出于安全考虑，API Key 通过<span className="text-cyan-400 font-mono"> ANTHROPIC_API_KEY </span>环境变量配置。</p>
                    <p className="text-slate-500">需要修改 API Key？请在系统中设置环境变量后重启守护进程。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-300">模型</div>
                  <div className="text-xs text-slate-500">选择使用的 Claude 模型</div>
                </div>
                <select
                  value={config.llm.model}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      llm: { ...config.llm, model: e.target.value },
                    })
                  }
                  className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4"
                >
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-300">Temperature</div>
                    <div className="text-xs text-slate-500">控制输出的随机性 (0-1)</div>
                  </div>
                  <div className="text-amber-500 font-mono font-bold">{config.llm.temperature}</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.llm.temperature}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      llm: { ...config.llm, temperature: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-300">Max Tokens</div>
                  <div className="text-xs text-slate-500">最大生成 token 数量</div>
                </div>
                <input
                  type="number"
                  min="1024"
                  max="16384"
                  value={config.llm.maxTokens}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      llm: { ...config.llm, maxTokens: parseInt(e.target.value) },
                    })
                  }
                  className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4 w-24"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-300">启用提示缓存</div>
                  <div className="text-xs text-slate-500">减少重复请求的 token 消耗</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.llm.enablePromptCaching ?? true}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        llm: { ...config.llm, enablePromptCaching: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div>
                <div className="mb-2">
                  <div className="text-sm font-bold text-slate-300">API 端点配置</div>
                  <div className="text-xs text-slate-500">配置自定义 API 端点（如 claude-code-router）</div>
                </div>
                <input
                  type="text"
                  placeholder="http://localhost:8787 (留空使用官方 API)"
                  value={config.llm.baseURL || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      llm: { ...config.llm, baseURL: e.target.value || undefined },
                    })
                  }
                  className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {/* 当前 API 端点状态指示 */}
                <div className="mt-3 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${config.llm.baseURL ? 'bg-cyan-500' : 'bg-green-500'}`} />
                  <span className="text-xs font-mono text-slate-400">
                    当前使用: {config.llm.baseURL ? (
                      <span className="text-cyan-400">Claude Code Router ({config.llm.baseURL})</span>
                    ) : (
                      <span className="text-green-400">Anthropic 官方 API</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => window.location.href = '/'}
              className="border-2 border-slate-600 hover:border-slate-400 text-slate-300 hover:text-slate-100 font-mono font-bold py-3 px-6 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="border-2 border-amber-500 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-mono font-bold py-3 px-6 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
