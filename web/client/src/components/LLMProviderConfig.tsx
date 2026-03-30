import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, theme, Select, Slider, InputNumber, Checkbox, Input } from 'antd';

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
      } : {}}
    >
      {/* 选中指示器 */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
        >
          <span className="text-white text-xs">✓</span>
        </motion.div>
      )}

      {/* 图标 */}
      <span className="text-4xl">{meta.icon}</span>

      {/* 标题 */}
      <div className="text-center">
        <h4 className="font-bold text-slate-100">{meta.title}</h4>
        <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
      </div>

      {/* 状态指示 */}
      {configured && !selected && (
        <div className="absolute bottom-2 right-2">
          <span className="text-xs text-emerald-400">✓ 已配置</span>
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
  // 使用 initialConfig.llm?.activeProvider 作为初始值（这次真正使用它）
  const [selectedMode, setSelectedMode] = useState<ProviderMode>(
    () => initialConfig?.llm?.activeProvider || 'claude'
  );
  const [config, setConfig] = useState(initialConfig);
  const isFirstRender = useRef(true);

  // 同步外部 config 变化
  useEffect(() => {
    setConfig(initialConfig);

    // 同步 activeProvider
    const activeProvider = initialConfig?.llm?.activeProvider;
    if (activeProvider) {
      setSelectedMode(activeProvider as ProviderMode);
    }
  }, [initialConfig]);

  // 检查是否已配置（基于嵌套配置对象是否存在）
  const isConfigured = {
    claude: !!config.llm?.claude?.model,
    openai: !!config.llm?.openai?.model,
    ccr: !!config.llm?.ccr?.model && !!config.llm?.ccr?.baseURL,
  };

  // 辅助函数：更新指定提供商的配置
  const updateProviderConfig = (provider: ProviderMode, updates: any) => {
    setConfig({
      ...config,
      llm: {
        ...config.llm,
        [provider]: {
          ...config.llm[provider],
          ...updates,
        },
      },
    });
  };

  // 提供商切换处理（只修改 activeProvider 字段）
  const handleProviderChange = (mode: ProviderMode) => {
    setSelectedMode(mode);
    setConfig({
      ...config,
      llm: {
        ...config.llm,
        activeProvider: mode,
      },
    });
  };

  // 当配置变化时通知父组件
  useEffect(() => {
    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const configChanged = JSON.stringify(config) !== JSON.stringify(initialConfig);
    if (configChanged) {
      onSave(config);
    }
  }, [config, onSave]);

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
          选择 LLM 服务提供商并配置相关参数。每个提供商的配置独立保存，互不干扰。
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
            onSelect={() => handleProviderChange(mode)}
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
                  value={config.llm?.claude?.model || 'claude-sonnet-4-6'}
                  onChange={(value) => updateProviderConfig('claude', { model: value })}
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
                  Temperature <span className="text-slate-400">({config.llm?.claude?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.claude?.temperature ?? 0.3}
                  onChange={(value) => updateProviderConfig('claude', { temperature: value })}
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
                  value={config.llm?.claude?.maxTokens ?? 4096}
                  onChange={(value) => updateProviderConfig('claude', { maxTokens: value || 4096 })}
                  className="w-full"
                />
              </div>

              {/* Prompt Caching */}
              <div className="flex flex-col gap-2">
                <Checkbox
                  checked={config.llm?.claude?.enablePromptCaching ?? true}
                  onChange={(e) => updateProviderConfig('claude', { enablePromptCaching: e.target.checked })}
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

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Base URL <span className="text-slate-400">(可选)</span>
                </label>
                <Input
                  value={config.llm?.openai?.baseURL || ''}
                  onChange={(e) => updateProviderConfig('openai', { baseURL: e.target.value || undefined })}
                  placeholder="https://api.openai.com (默认)"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  留空使用 OpenAI 官方 API；填写自定义 URL 用于 Azure、本地 Ollama 等
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key <span className="text-slate-400">(可选)</span>
                </label>
                <Input.Password
                  value={config.llm?.openai?.apiKey || ''}
                  onChange={(e) => updateProviderConfig('openai', { apiKey: e.target.value || undefined })}
                  placeholder="sk-... (留空从环境变量读取)"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 留空则从环境变量 OPENAI_API_KEY 读取；填写后优先使用此处配置
                </p>
              </div>

              {/* Organization ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Organization ID <span className="text-slate-400">(可选)</span>
                </label>
                <Input
                  value={config.llm?.openai?.organization || ''}
                  onChange={(e) => updateProviderConfig('openai', { organization: e.target.value || undefined })}
                  placeholder="org-..."
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  仅在使用 OpenAI 官方 API 且有多个组织时需要
                </p>
              </div>

              {/* Model 输入 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model
                </label>
                <Input
                  value={config.llm?.openai?.model || ''}
                  onChange={(e) => updateProviderConfig('openai', { model: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  placeholder="gpt-4-turbo, deepseek-chat, qwen-turbo..."
                  className="w-full font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 支持任意模型名称：gpt-4-turbo, deepseek-chat, qwen-turbo, Azure 部署名等
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature <span className="text-slate-400">({config.llm?.openai?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.openai?.temperature ?? 0.3}
                  onChange={(value) => updateProviderConfig('openai', { temperature: value })}
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
                  value={config.llm?.openai?.maxTokens ?? 4096}
                  onChange={(value) => updateProviderConfig('openai', { maxTokens: value || 4096 })}
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
                    通过本地代理服务访问 Claude API，支持自定义端点
                  </p>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Base URL <span className="text-red-400">*</span>
                </label>
                <Input
                  value={config.llm?.ccr?.baseURL || ''}
                  onChange={(e) => updateProviderConfig('ccr', { baseURL: e.target.value })}
                  placeholder="http://localhost:3456"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  CCR 代理服务的地址，例如 http://localhost:3456
                </p>
              </div>

              {/* Model 输入 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Model
                </label>
                <Input
                  value={config.llm?.ccr?.model || ''}
                  onChange={(e) => updateProviderConfig('ccr', { model: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  placeholder="claude-sonnet-4-6"
                  className="w-full font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  💡 根据 CCR 代理支持的模型填写，通常为 Claude 模型名称
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Temperature <span className="text-slate-400">({config.llm?.ccr?.temperature ?? 0.3})</span>
                </label>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm?.ccr?.temperature ?? 0.3}
                  onChange={(value) => updateProviderConfig('ccr', { temperature: value })}
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
                  value={config.llm?.ccr?.maxTokens ?? 4096}
                  onChange={(value) => updateProviderConfig('ccr', { maxTokens: value || 4096 })}
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
