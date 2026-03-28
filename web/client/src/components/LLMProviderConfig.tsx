import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, theme, Select, Slider, InputNumber, Checkbox, Input, AutoComplete } from 'antd';
import { getModelHistory } from '../utils/modelHistory';

// Provider 类型定义
type ProviderMode = 'claude' | 'openai' | 'ccr';

interface ProviderCardProps {
  mode: ProviderMode;
  selected: boolean;
  configured: boolean;
  onSelect: () => void;
}

// Provider 元数据
const PROVIDER_META = {
  claude: {
    title: 'Claude',
    subtitle: 'Official API',
    icon: '🔵',
    color: 'blue',
    description: '使用 Anthropic 官方 Claude API',
  },
  openai: {
    title: 'OpenAI-Compatible API',
    subtitle: 'Compatible API',
    icon: '🟢',
    color: 'green',
    description: '支持 OpenAI、Azure OpenAI、本地 Ollama 等所有 OpenAI 兼容 API',
  },
  ccr: {
    title: 'CCR',
    subtitle: 'Proxy',
    icon: '🟣',
    color: 'purple',
    description: 'Claude Code Router 代理模式',
  },
};

// Provider 选择卡片
const ProviderCard: React.FC<ProviderCardProps> = ({
  mode,
  selected,
  configured,
  onSelect,
}) => {
  const meta = PROVIDER_META[mode];

  // 颜色映射（避免动态 class 失效）
  const colorMap = {
    blue: {
      border: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      shadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
    },
    green: {
      border: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      shadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
    },
    purple: {
      border: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.1)',
      shadow: '0 10px 15px -3px rgba(168, 85, 247, 0.2)',
    },
  };

  const colors = colorMap[meta.color as keyof typeof colorMap];

  return (
    <button
      onClick={onSelect}
      className={`
        relative flex flex-col items-center gap-3 p-6 rounded-xl
        transition-all duration-300 border-2
        ${selected ? 'scale-105' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'}
      `}
      style={selected ? {
        borderColor: colors.border,
        backgroundColor: colors.bg,
        boxShadow: colors.shadow,
      } : undefined}
    >
      {/* 图标 */}
      <div className="text-4xl">{meta.icon}</div>

      {/* 标题 */}
      <div className="text-center">
        <div className="font-semibold text-slate-100">{meta.title}</div>
        <div className="text-sm text-slate-400">{meta.subtitle}</div>
      </div>

      {/* 状态指示器 */}
      {configured && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-green-400">
          <span>✓</span>
          <span>已配置</span>
        </div>
      )}
    </button>
  );
};

// 主配置组件
interface LLMProviderConfigProps {
  config: any;
  onSave: (config: any) => void;
}

export const LLMProviderConfig: React.FC<LLMProviderConfigProps> = ({ config: initialConfig, onSave }) => {
  // 检测当前模式
  const detectMode = (cfg: any): ProviderMode => {
    // 明确指定 openai provider
    if (cfg.llm?.provider === 'openai') return 'openai';

    // 明确指定 anthropic provider 或完全没有配置时，默认为 claude
    if (cfg.llm?.provider === 'anthropic') return 'claude';

    // 有 baseURL 且 provider 未明确指定为 openai/anthropic，视为 CCR
    if (cfg.llm?.baseURL && !cfg.llm?.provider) return 'ccr';

    // 默认为 claude
    return 'claude';
  };

  const [selectedMode, setSelectedMode] = useState<ProviderMode>(detectMode(initialConfig));
  const [config, setConfig] = useState(initialConfig);
  const isFirstRender = useRef(true);

  // 同步外部 config 变化
  useEffect(() => {
    setConfig(initialConfig);
    // 保留用户的 selectedMode 选择，不从 initialConfig 重新推导
    // 这样避免了 handleModeChange 设置的 mode 被覆盖
  }, [initialConfig]);

  // 检查是否已配置（基于 config 数据判断）
  const isConfigured = {
    claude: config.llm?.provider === 'anthropic' || (!config.llm?.provider && !config.llm?.baseURL),
    openai: config.llm?.provider === 'openai',
    ccr: !!config.llm?.baseURL,
  };

  // 模式切换处理
  const handleModeChange = (mode: ProviderMode) => {
    setSelectedMode(mode);

    // 更新 config 中的 provider 和相关字段
    const newConfig = { ...config };
    if (mode === 'claude') {
      newConfig.llm = {
        ...newConfig.llm,
        provider: 'anthropic',
        baseURL: null,
        model: config.llm?.model || 'claude-sonnet-4-6'  // 保留用户已输入的值
      };
    } else if (mode === 'openai') {
      newConfig.llm = {
        ...newConfig.llm,
        provider: 'openai',
        baseURL: null,
        model: config.llm?.model || 'gpt-4-turbo'  // 保留用户已输入的值
      };
    } else if (mode === 'ccr') {
      newConfig.llm = {
        ...newConfig.llm,
        provider: undefined,
        // 保留现有 baseURL，如果没有则设置默认值
        baseURL: config.llm?.baseURL || 'http://localhost:3456',
        model: config.llm?.model || 'claude-sonnet-4-6'  // 保留用户已输入的值
      };
      // CCR 模式不设置 provider，通过 baseURL 自动检测
    }
    setConfig(newConfig);
  };

  // 当配置变化时通知父组件（但不立即保存）
  useEffect(() => {
    console.log('[LLMProviderConfig] useEffect triggered, isFirstRender:', isFirstRender.current);

    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false;
      console.log('[LLMProviderConfig] Skipping first render');
      return;
    }

    const configChanged = JSON.stringify(config) !== JSON.stringify(initialConfig);
    console.log('[LLMProviderConfig] Config changed:', configChanged);
    console.log('[LLMProviderConfig] Current config.llm:', config.llm);
    console.log('[LLMProviderConfig] Initial config.llm:', initialConfig.llm);

    // 只在配置实际变化时才更新
    if (configChanged) {
      console.log('[LLMProviderConfig] Calling onSave');
      onSave(config);
    }
  }, [config, onSave]); // 移除 initialConfig 依赖，避免循环

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#06b6d4',          // cyan-500 (app accent)
          colorBgContainer: '#0f172a',      // slate-900 (matches page)
          colorBorder: '#475569',           // slate-600 (unified borders)
          colorText: '#e2e8f0',             // slate-200 (primary text)
          colorTextSecondary: '#94a3b8',    // slate-400 (secondary text)
          colorBgElevated: '#1e293b',       // slate-800 (dropdown backgrounds)
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
      }}
    >
      <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100">LLM Provider 配置</h3>
        <p className="text-sm text-slate-400 mt-1">
          选择 LLM 服务提供商并配置相关参数
        </p>
      </div>

      {/* Provider 选择器 */}
      <div className="grid grid-cols-3 gap-4">
        {(['claude', 'openai', 'ccr'] as ProviderMode[]).map((mode) => (
          <ProviderCard
            key={mode}
            mode={mode}
            selected={selectedMode === mode}
            configured={isConfigured[mode]}
            onSelect={() => handleModeChange(mode)}
          />
        ))}
      </div>

      {/* 配置表单区域 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-800/80 rounded-xl border-2 border-slate-700 p-6 shadow-sm"
        >
          {/* Claude 配置 */}
          {selectedMode === 'claude' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/30">
                <span className="text-2xl">📘</span>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-cyan-300 mb-1">
                    {PROVIDER_META.claude.description}
                  </p>
                  <p className="text-cyan-400/80">
                    需要在环境变量中设置 <code className="px-1.5 py-0.5 bg-cyan-500/20 rounded font-mono text-xs text-cyan-300">ANTHROPIC_API_KEY</code>
                  </p>
                </div>
              </div>

              {/* Model 选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model
                </label>
                <Select
                  value={config.llm?.model || 'claude-sonnet-4-6'}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
                  options={[
                    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (推荐)' },
                    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
                    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
                    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (旧版)' },
                    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (旧版)' },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature <span className="text-slate-400">({config.llm?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.temperature ?? 0.3}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, temperature: value } })}
                  marks={{ 0: '精确 (0)', 1: '随机 (1)' }}
                />
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Tokens
                </label>
                <InputNumber
                  min={1024}
                  max={16384}
                  value={config.llm?.maxTokens ?? 4096}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, maxTokens: value || 4096 } })}
                  className="w-full"
                />
              </div>

              {/* Prompt Caching */}
              <div className="flex flex-col gap-2">
                <Checkbox
                  checked={config.llm?.enablePromptCaching ?? true}
                  onChange={(e) => setConfig({ ...config, llm: { ...config.llm, enablePromptCaching: e.target.checked } })}
                >
                  <span className="text-sm font-medium">启用 Prompt Caching</span>
                </Checkbox>
                <p className="text-xs text-slate-400 ml-6">
                  💡 Prompt Caching 可以降低重复内容的 token 消耗，提升响应速度
                </p>
              </div>
            </div>
          )}

          {/* OpenAI 配置 */}
          {selectedMode === 'openai' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-500/5 rounded-lg border border-green-500/30">
                <span className="text-2xl">🟢</span>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-green-300 mb-1">
                    {PROVIDER_META.openai.description}
                  </p>
                  <p className="text-green-400/80">
                    支持 OpenAI 官方、Azure OpenAI、MatrixLLM、本地 Ollama 等所有兼容 OpenAI 格式的 API 服务
                  </p>
                </div>
              </div>

              {/* Model 选择 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model
                </label>
                <AutoComplete
                  value={config.llm?.model || ''}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
                  options={(() => {
                    const history = getModelHistory('openai');
                    const defaults = ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
                    // 去重后合并：历史 + 默认推荐
                    const suggestions = [...new Set([...history, ...defaults])];
                    return suggestions.map(m => ({ value: m, label: m }));
                  })()}
                  placeholder="gpt-4-turbo"
                  className="w-full font-mono"
                  filterOption={(input, option) =>
                    option?.value.toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                />
                <p className="text-xs text-slate-400 mt-1">
                  输入任意模型名称（OpenAI、Azure 部署名、Ollama 自定义模型等）
                </p>
              </div>

              {/* Base URL (可选) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Base URL <span className="text-slate-400">(可选)</span>
                </label>
                <Input
                  value={config.llm?.baseURL || ''}
                  onChange={(e) => setConfig({ ...config, llm: { ...config.llm, baseURL: e.target.value || null } })}
                  placeholder="https://api.openai.com"
                  className="font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  自定义 API 端点（可选）。支持 Azure OpenAI、本地 Ollama 等
                </p>
              </div>

              {/* API Key (可选) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key <span className="text-slate-400">(可选)</span>
                </label>
                <Input.Password
                  value={config.llm?.openai?.apiKey || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    llm: {
                      ...config.llm,
                      openai: { ...config.llm?.openai, apiKey: e.target.value || null }
                    }
                  })}
                  placeholder="sk-..."
                  className="font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  留空则使用环境变量 OPENAI_API_KEY。⚠️ API Key 将以明文存储在配置文件中
                </p>
              </div>

              {/* Organization (可选) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Organization ID <span className="text-slate-400">(可选)</span>
                </label>
                <Input
                  value={config.llm?.openai?.organization || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    llm: {
                      ...config.llm,
                      openai: { ...config.llm?.openai, organization: e.target.value || null }
                    }
                  })}
                  placeholder="org-xxxxx"
                  className="font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  如果你的 API key 属于多个组织，需要指定组织 ID
                </p>
              </div>

              {/* Temperature & Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature <span className="text-slate-400">({config.llm?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.temperature ?? 0.3}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, temperature: value } })}
                  marks={{ 0: '精确 (0)', 1: '随机 (1)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Tokens
                </label>
                <InputNumber
                  min={1024}
                  max={16384}
                  value={config.llm?.maxTokens ?? 4096}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, maxTokens: value || 4096 } })}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* CCR 配置 */}
          {selectedMode === 'ccr' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-purple-500/5 rounded-lg border border-purple-500/30">
                <span className="text-2xl">🟣</span>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-purple-300 mb-1">
                    {PROVIDER_META.ccr.description}
                  </p>
                  <p className="text-purple-400/80">
                    通过本地代理服务访问 Claude API，支持自定义路由和缓存
                  </p>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Proxy Endpoint <span className="text-red-500">*</span>
                </label>
                <Input
                  value={config.llm?.baseURL || ''}
                  onChange={(e) => setConfig({ ...config, llm: { ...config.llm, baseURL: e.target.value || null } })}
                  placeholder="http://localhost:3456"
                  className="font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  CCR 代理服务的地址，通常运行在本地 localhost
                </p>
              </div>

              {/* Model 选择 (CCR 使用 Claude 模型) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model
                </label>
                <Select
                  value={config.llm?.model || 'claude-sonnet-4-6'}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, model: value } })}
                  options={[
                    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
                    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
                    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Temperature & Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature <span className="text-slate-400">({config.llm?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.temperature ?? 0.3}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, temperature: value } })}
                  marks={{ 0: '精确 (0)', 1: '随机 (1)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Tokens
                </label>
                <InputNumber
                  min={1024}
                  max={16384}
                  value={config.llm?.maxTokens ?? 4096}
                  onChange={(value) => setConfig({ ...config, llm: { ...config.llm, maxTokens: value || 4096 } })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
    </ConfigProvider>
  );
};
