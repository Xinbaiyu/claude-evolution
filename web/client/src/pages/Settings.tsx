import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { toast } from '../components/Toast';
import LearningTab from './Settings/LearningTab';
import { LLMProviderConfig } from '../components/LLMProviderConfig';
import { addModelToHistory } from '../utils/modelHistory';
import { TimePicker, Tag, ConfigProvider, theme } from 'antd';

type TabType = 'scheduler' | 'llm' | 'learning' | 'notifications';

const PRESET_LABELS: Record<string, string> = {
  dingtalk: '钉钉',
  feishu: '飞书',
  wecom: '企业微信',
  'slack-incoming': 'Slack',
};

export default function Settings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('scheduler');
  const [testingWebhook, setTestingWebhook] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', preset: 'dingtalk' as string, secret: '' });

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

  // 使用 useCallback 包装 LLM 配置更新回调，避免每次渲染创建新函数
  const handleLLMConfigChange = useCallback((newConfig: any) => {
    console.log('[Settings] handleLLMConfigChange called with:', JSON.stringify(newConfig.llm, null, 2));
    setConfig(newConfig);
  }, []);

  const handleSave = async () => {
    console.log('[Settings] handleSave called, activeTab:', activeTab);
    console.log('[Settings] config:', JSON.stringify(config, null, 2));

    setSaving(true);
    try {
      // 根据当前 Tab 保存不同的配置
      if (activeTab === 'learning' && config.learning) {
        console.log('[Settings] Saving learning config');
        await apiClient.updateLearningConfig(config.learning);
      } else {
        console.log('[Settings] Saving full config');
        await apiClient.updateConfig(config);
      }

      // 保存 OpenAI 模型名称到历史记录
      if (config.llm?.provider === 'openai' && config.llm?.model) {
        addModelToHistory('openai', config.llm.model);
      }

      if (activeTab === 'scheduler') {
        toast.success('配置已保存，调度器已自动重载');
      } else {
        toast.success('配置已保存');
      }
    } catch (error: any) {
      console.error('[Settings] Save failed:', error);
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const webhooks: Array<{ name: string; url: string; preset?: string; secret?: string; enabled?: boolean }> =
    config?.reminders?.channels?.webhook?.webhooks || [];

  const maskUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.origin}/***`;
    } catch {
      return url.length > 30 ? `${url.slice(0, 30)}...` : url;
    }
  };

  const updateWebhooks = (newWebhooks: typeof webhooks) => {
    setConfig({
      ...config,
      reminders: {
        ...config.reminders,
        channels: {
          ...config.reminders?.channels,
          webhook: {
            ...config.reminders?.channels?.webhook,
            enabled: newWebhooks.length > 0,
            webhooks: newWebhooks,
          },
        },
      },
    });
  };

  const resetForm = () => {
    setWebhookForm({ name: '', url: '', preset: 'dingtalk', secret: '' });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleAddWebhook = () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      toast.error('名称和 URL 不能为空');
      return;
    }
    const entry = {
      name: webhookForm.name.trim(),
      url: webhookForm.url.trim(),
      preset: webhookForm.preset,
      secret: webhookForm.secret.trim() || undefined,
      enabled: true,
    };
    if (editingIndex !== null) {
      const updated = webhooks.map((w, i) => (i === editingIndex ? entry : w));
      updateWebhooks(updated);
    } else {
      updateWebhooks([...webhooks, entry]);
    }
    resetForm();
  };

  const handleDeleteWebhook = (index: number) => {
    updateWebhooks(webhooks.filter((_, i) => i !== index));
  };

  const handleEditWebhook = (index: number) => {
    const w = webhooks[index];
    setWebhookForm({ name: w.name, url: w.url, preset: w.preset || 'dingtalk', secret: w.secret || '' });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleTestWebhook = async (index: number) => {
    setTestingWebhook(index);
    try {
      const w = webhooks[index];
      const result = await apiClient.testWebhook({ name: w.name, url: w.url, preset: w.preset, secret: w.secret });
      if (result.success) {
        toast.success(`${w.name}: 测试消息发送成功`);
      } else {
        toast.error(`${w.name}: ${result.error || '发送失败'}`);
      }
    } catch (error: any) {
      toast.error(error.message || '测试失败');
    } finally {
      setTestingWebhook(null);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-amber-500 text-xl font-mono">加载配置中...</div>
      </div>
    );
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b-2 border-slate-700">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'scheduler'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              调度器
            </button>
            <button
              onClick={() => setActiveTab('llm')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'llm'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Claude 模型
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'learning'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              增量学习 {config.learning ? '' : '(未启用)'}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-6 py-3 font-mono font-bold transition-colors border-b-4 ${
                activeTab === 'notifications'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              通知通道
            </button>
          </nav>
        </div>

        <div className="space-y-6">
          {/* 调度器配置 */}
          {activeTab === 'scheduler' && (
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
                  <div className="text-sm font-bold text-slate-300">调度模式</div>
                  <div className="text-xs text-slate-500">选择间隔模式或定时模式</div>
                </div>
                <select
                  value={config.scheduler.interval}
                  onChange={(e) => {
                    const newInterval = e.target.value;
                    const updated = {
                      ...config,
                      scheduler: { ...config.scheduler, interval: newInterval },
                    };
                    if (newInterval === 'timepoints' && !config.scheduler.scheduleTimes) {
                      updated.scheduler.scheduleTimes = [];
                    }
                    setConfig(updated);
                  }}
                  disabled={!config.scheduler.enabled}
                  className="border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono font-bold py-2 px-4 disabled:opacity-50"
                >
                  <option value="6h">每 6 小时</option>
                  <option value="12h">每 12 小时</option>
                  <option value="24h">每 24 小时</option>
                  <option value="timepoints">定时模式</option>
                </select>
              </div>

              {/* 定时模式：时间点编辑器 */}
              {config.scheduler.interval === 'timepoints' && config.scheduler.enabled && (
                <ConfigProvider
                  theme={{
                    algorithm: theme.darkAlgorithm,
                    token: {
                      colorPrimary: '#06b6d4',
                      colorBgContainer: '#1e293b',
                      colorBorder: '#475569',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    },
                  }}
                >
                <div className="border-2 border-cyan-500/30 bg-cyan-500/5 p-4">
                  <div className="text-sm font-bold text-cyan-400 mb-3">时间点配置</div>
                  <div className="text-xs text-slate-400 mb-3">指定每天执行分析的具体时间（最多 12 个）</div>

                  {/* 已添加的时间点标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(config.scheduler.scheduleTimes || []).map((time: string) => (
                      <Tag
                        key={time}
                        closable
                        onClose={() => {
                          const newTimes = (config.scheduler.scheduleTimes || []).filter((t: string) => t !== time);
                          setConfig({
                            ...config,
                            scheduler: { ...config.scheduler, scheduleTimes: newTimes },
                          });
                        }}
                        style={{
                          fontSize: 14,
                          padding: '4px 12px',
                          borderColor: '#06b6d4',
                          backgroundColor: 'rgba(6, 182, 212, 0.1)',
                          color: '#22d3ee',
                        }}
                      >
                        {time}
                      </Tag>
                    ))}
                  </div>

                  {/* 添加新时间点 */}
                  {(config.scheduler.scheduleTimes || []).length < 12 && (
                    <div className="flex items-center gap-3">
                      <TimePicker
                        format="HH:mm"
                        placeholder="选择时间"
                        size="middle"
                        minuteStep={5}
                        needConfirm={false}
                        onChange={(time) => {
                          if (!time) return;
                          const value = time.format('HH:mm');
                          const existing = config.scheduler.scheduleTimes || [];
                          if (existing.includes(value)) {
                            toast.error('该时间点已存在');
                            return;
                          }
                          const newTimes = [...existing, value].sort();
                          setConfig({
                            ...config,
                            scheduler: { ...config.scheduler, scheduleTimes: newTimes },
                          });
                        }}
                        value={null}
                        style={{ width: 140 }}
                      />
                      <span className="text-xs text-slate-500">
                        已添加 {(config.scheduler.scheduleTimes || []).length}/12 个
                      </span>
                    </div>
                  )}

                  {(config.scheduler.scheduleTimes || []).length === 0 && (
                    <div className="text-xs text-amber-400 mt-2">请至少添加一个时间点</div>
                  )}
                </div>
                </ConfigProvider>
              )}
            </div>
          </div>
          )}

          {/* LLM 配置 */}
          {activeTab === 'llm' && config && (
            <div className="border-4 border-slate-700 bg-slate-900 p-6">
              <LLMProviderConfig
                config={config}
                onSave={handleLLMConfigChange}
              />
            </div>
          )}

          {/* 增量学习配置 */}
          {activeTab === 'learning' && (
            <LearningTab config={config} onConfigChange={setConfig} />
          )}

          {/* 通知通道配置 */}
          {activeTab === 'notifications' && (
            <div className="border-4 border-slate-700 bg-slate-900 p-6">
              <h2 className="text-xl font-black text-amber-500 mb-4 font-mono">通知通道</h2>
              <div className="text-xs text-slate-500 mb-6">
                配置 Webhook 通知端点，分析完成或提醒触发时自动推送到钉钉、飞书等即时通讯工具。
              </div>

              {/* Webhook 列表 */}
              {webhooks.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {webhooks.map((w, i) => (
                    <div
                      key={i}
                      className="border-2 border-slate-700 bg-slate-800 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-200">{w.name}</span>
                          {w.preset && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                              {PRESET_LABELS[w.preset] || w.preset}
                            </span>
                          )}
                          {w.secret && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 font-mono">
                              签名
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {maskUrl(w.url)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTestWebhook(i)}
                          disabled={testingWebhook === i}
                          className="text-xs border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-3 py-1.5 font-mono transition-colors disabled:opacity-50"
                        >
                          {testingWebhook === i ? '发送中...' : '测试'}
                        </button>
                        <button
                          onClick={() => handleEditWebhook(i)}
                          className="text-xs border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 px-3 py-1.5 font-mono transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(i)}
                          className="text-xs border border-red-500/50 text-red-400 hover:bg-red-500/10 px-3 py-1.5 font-mono transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-700 p-8 text-center mb-6">
                  <div className="text-slate-500 text-sm">暂无 Webhook 配置</div>
                  <div className="text-slate-600 text-xs mt-1">点击下方按钮添加通知端点</div>
                </div>
              )}

              {/* 添加 / 编辑表单 */}
              {showAddForm ? (
                <div className="border-2 border-cyan-500/30 bg-cyan-500/5 p-4 space-y-4">
                  <div className="text-sm font-bold text-cyan-400">
                    {editingIndex !== null ? '编辑 Webhook' : '添加 Webhook'}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">名称</label>
                      <input
                        type="text"
                        placeholder="例：钉钉群机器人"
                        value={webhookForm.name}
                        onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">预设类型</label>
                      <select
                        value={webhookForm.preset}
                        onChange={(e) => setWebhookForm({ ...webhookForm, preset: e.target.value })}
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm"
                      >
                        <option value="dingtalk">钉钉</option>
                        <option value="feishu">飞书</option>
                        <option value="wecom">企业微信</option>
                        <option value="slack-incoming">Slack</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Webhook URL</label>
                    <input
                      type="text"
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      value={webhookForm.url}
                      onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                      className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">
                      签名密钥 <span className="text-slate-600 font-normal">(可选，钉钉加签)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="SEC..."
                      value={webhookForm.secret}
                      onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                      className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={resetForm}
                      className="text-sm border border-slate-600 text-slate-400 hover:text-slate-200 px-4 py-2 font-mono transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddWebhook}
                      className="text-sm border border-cyan-500 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-4 py-2 font-mono font-bold transition-colors"
                    >
                      {editingIndex !== null ? '保存修改' : '添加'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full border-2 border-dashed border-slate-600 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 py-3 font-mono text-sm transition-colors"
                >
                  + 添加 Webhook
                </button>
              )}
            </div>
          )}

          {/* 机器人配置（通知通道 tab 内） */}
          {activeTab === 'notifications' && (
            <div className="border-4 border-slate-700 bg-slate-900 p-6">
              <h2 className="text-xl font-black text-amber-500 mb-4 font-mono">钉钉机器人</h2>
              <div className="text-xs text-slate-500 mb-6">
                启用后可在钉钉群 @机器人 进行双向交互：查状态、触发分析、AI 对话等。
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-300">启用机器人</div>
                    <div className="text-xs text-slate-500">通过 Stream 长连接接收钉钉消息，无需公网 IP</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config?.bot?.enabled || false}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bot: {
                            ...config.bot,
                            enabled: e.target.checked,
                            dingtalk: {
                              ...config.bot?.dingtalk,
                              enabled: e.target.checked,
                            },
                            chat: config.bot?.chat || { enabled: true, contextWindow: 20, contextTimeoutMinutes: 30 },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {config?.bot?.enabled && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ClientID <span className="text-slate-600 font-normal">(即 AppKey)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="钉钉开发者后台 → 应用凭证 → AppKey"
                        value={config.bot?.dingtalk?.clientId || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            bot: {
                              ...config.bot,
                              dingtalk: {
                                ...config.bot?.dingtalk,
                                enabled: true,
                                clientId: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        ClientSecret <span className="text-slate-600 font-normal">(即 AppSecret)</span>
                      </label>
                      <input
                        type="password"
                        placeholder="钉钉开发者后台 → 应用凭证 → AppSecret"
                        value={config.bot?.dingtalk?.clientSecret || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            bot: {
                              ...config.bot,
                              dingtalk: {
                                ...config.bot?.dingtalk,
                                enabled: true,
                                clientSecret: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-300">AI 对话</div>
                        <div className="text-xs text-slate-500">无匹配命令时调用 Claude 进行开放式对话</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.bot?.chat?.enabled !== false}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bot: {
                                ...config.bot,
                                chat: {
                                  ...config.bot?.chat,
                                  enabled: e.target.checked,
                                  contextWindow: config.bot?.chat?.contextWindow || 20,
                                  contextTimeoutMinutes: config.bot?.chat?.contextTimeoutMinutes || 30,
                                },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        提醒推送用户 <span className="text-slate-600 font-normal">(私聊机器人发 /myid 获取)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="钉钉 userId，多个用逗号分隔"
                        value={(config.bot?.dingtalk?.userIds || []).join(',')}
                        onChange={(e) => {
                          const ids = e.target.value
                            .split(',')
                            .map((s: string) => s.trim())
                            .filter(Boolean);
                          setConfig({
                            ...config,
                            bot: {
                              ...config.bot,
                              dingtalk: {
                                ...config.bot?.dingtalk,
                                userIds: ids,
                              },
                            },
                          });
                        }}
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <div className="text-xs text-slate-600 mt-1">填入后，提醒会通过机器人私聊推送给这些用户</div>
                    </div>

                    <div className="border-2 border-cyan-500/30 bg-cyan-500/5 p-4">
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>使用 <span className="text-cyan-400 font-mono">Stream 模式</span>，daemon 主动连接钉钉服务器，无需公网 IP 或内网穿透。</p>
                        <p className="text-slate-500">在钉钉开发者后台创建企业内部应用 → 添加机器人能力 → 选择 Stream 模式 → 获取 AppKey/AppSecret。</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Claude Code Bridge 配置（通知通道 tab 内） */}
          {activeTab === 'notifications' && config?.bot?.enabled && (
            <div className="border-4 border-slate-700 bg-slate-900 p-6">
              <h2 className="text-xl font-black text-amber-500 mb-4 font-mono">Claude Code 桥接</h2>
              <div className="text-xs text-slate-500 mb-6">
                启用后，机器人收到非命令消息时会在你的机器上执行 Claude Code CLI，获得与终端一致的完整能力。
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-300">启用 CC 桥接</div>
                    <div className="text-xs text-slate-500">spawn claude -p 子进程处理消息</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.bot?.cc?.enabled || false}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          bot: {
                            ...config.bot,
                            cc: {
                              ...config.bot?.cc,
                              enabled: e.target.checked,
                              defaultCwd: config.bot?.cc?.defaultCwd || '~',
                              allowedDirs: config.bot?.cc?.allowedDirs || [],
                              timeoutMs: config.bot?.cc?.timeoutMs || 120000,
                              maxBudgetUsd: config.bot?.cc?.maxBudgetUsd || 0.5,
                              permissionMode: config.bot?.cc?.permissionMode || 'bypassPermissions',
                            },
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {config.bot?.cc?.enabled && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">默认工作目录</label>
                      <input
                        type="text"
                        placeholder="~/projects"
                        value={config.bot?.cc?.defaultCwd || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            bot: { ...config.bot, cc: { ...config.bot?.cc, defaultCwd: e.target.value } },
                          })
                        }
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        允许目录 <span className="text-slate-600 font-normal">(白名单，逗号分隔)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="~/projects,~/work"
                        value={(config.bot?.cc?.allowedDirs || []).join(',')}
                        onChange={(e) => {
                          const dirs = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean);
                          setConfig({
                            ...config,
                            bot: { ...config.bot, cc: { ...config.bot?.cc, allowedDirs: dirs } },
                          });
                        }}
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <div className="text-xs text-slate-600 mt-1">为空则不限制（不推荐）</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">超时 (秒)</label>
                        <input
                          type="number"
                          min="5"
                          max="600"
                          value={Math.round((config.bot?.cc?.timeoutMs || 120000) / 1000)}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bot: { ...config.bot, cc: { ...config.bot?.cc, timeoutMs: parseInt(e.target.value) * 1000 } },
                            })
                          }
                          className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">单次预算 ($)</label>
                        <input
                          type="number"
                          min="0.01"
                          max="10"
                          step="0.1"
                          value={config.bot?.cc?.maxBudgetUsd || 0.5}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              bot: { ...config.bot, cc: { ...config.bot?.cc, maxBudgetUsd: parseFloat(e.target.value) } },
                            })
                          }
                          className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">
                        API 代理 <span className="text-slate-600 font-normal">(CCR baseURL，可选)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="http://127.0.0.1:3456 (留空继承环境变量)"
                        value={config.bot?.cc?.baseURL || ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            bot: { ...config.bot, cc: { ...config.bot?.cc, baseURL: e.target.value || null } },
                          })
                        }
                        className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate('/')}
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
    </>
  );
}
