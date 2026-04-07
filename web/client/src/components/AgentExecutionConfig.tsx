/**
 * Agent 执行配置组件（受控组件）
 * 用于配置钉钉任务、定时调研等 Agent 执行场景的参数
 */
import { useState, useEffect } from 'react';
import { Form } from 'antd';
import type { Config } from '../api/client';

interface AgentExecutionConfigProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export function AgentExecutionConfig({ config, onConfigChange }: AgentExecutionConfigProps) {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<'native' | 'ccr'>('native');

  // 从 props 同步到 form
  useEffect(() => {
    if (config.agent) {
      const isNative = !config.agent.baseURL;
      setMode(isNative ? 'native' : 'ccr');

      form.setFieldsValue({
        mode: isNative ? 'native' : 'ccr',
        baseURL: config.agent.baseURL || 'http://localhost:3456',
        defaultCwd: config.agent.defaultCwd,
        allowedDirs: config.agent.allowedDirs?.join(', ') || '',
        timeoutMs: Math.round(config.agent.timeoutMs / 1000),
        maxBudgetUsd: config.agent.maxBudgetUsd,
        permissionMode: config.agent.permissionMode,
      });
    }
  }, [config.agent, form]);

  // 状态提升：更新配置并通知父组件
  const updateAgentConfig = (updates: Partial<NonNullable<Config['agent']>>) => {
    onConfigChange({
      ...config,
      agent: {
        ...config.agent!,
        ...updates,
      },
    });
  };

  const handleModeChange = (newMode: 'native' | 'ccr') => {
    setMode(newMode);

    if (newMode === 'native') {
      updateAgentConfig({ baseURL: undefined });
    } else {
      updateAgentConfig({ baseURL: 'http://localhost:3456' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-black text-amber-500 mb-2 font-mono">
          Agent 执行配置
        </h2>
        <p className="text-sm text-slate-400">
          配置钉钉任务、定时调研等 Agent 执行场景的参数。所有 Agent 执行都使用此配置。
        </p>
      </div>

      {/* 执行模式选择器 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          执行模式
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('native')}
            className={`
              px-4 py-3 rounded-lg border-2 font-mono font-bold transition-all
              ${
                mode === 'native'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20'
                  : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
              }
            `}
          >
            🔵 原生 Claude
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('ccr')}
            className={`
              px-4 py-3 rounded-lg border-2 font-mono font-bold transition-all
              ${
                mode === 'ccr'
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/20'
                  : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
              }
            `}
          >
            🟣 CCR 代理
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          选择 Claude Code CLI 的执行方式
        </p>
      </div>

      {/* CCR 代理地址（条件渲染） */}
      {mode === 'ccr' && (
        <div className="border-2 border-purple-500/30 bg-purple-500/5 p-4 rounded-lg">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            CCR 代理地址 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={config.agent?.baseURL || ''}
            onChange={(e) => updateAgentConfig({ baseURL: e.target.value || undefined })}
            placeholder="http://localhost:3456"
            className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Claude Code Router 代理服务器地址
          </p>
        </div>
      )}

      {/* 工作目录配置组 */}
      <div className="border-2 border-slate-700 bg-slate-800/50 p-5 rounded-lg">
        <h4 className="text-sm font-bold text-cyan-400 mb-4 font-mono">
          📁 工作目录配置
        </h4>

        {/* 默认工作目录 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            默认工作目录 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={config.agent?.defaultCwd || ''}
            onChange={(e) => updateAgentConfig({ defaultCwd: e.target.value })}
            placeholder="~/Desktop"
            className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Agent 执行时的默认工作目录
          </p>
        </div>

        {/* 允许的目录 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            允许的目录
            <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono rounded">
              可选
            </span>
          </label>
          <textarea
            value={config.agent?.allowedDirs?.join(', ') || ''}
            onChange={(e) => {
              const dirs = e.target.value
                .split(',')
                .map((d) => d.trim())
                .filter(Boolean);
              updateAgentConfig({ allowedDirs: dirs });
            }}
            placeholder="~/Desktop, ~/Documents, ~/Projects"
            rows={3}
            className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            目录白名单，逗号分隔。留空表示不限制
          </p>
        </div>
      </div>

      {/* 执行控制组 */}
      <div className="border-2 border-slate-700 bg-slate-800/50 p-5 rounded-lg">
        <h4 className="text-sm font-bold text-cyan-400 mb-4 font-mono">
          ⚙️ 执行控制
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {/* 超时时间 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              执行超时（秒）
            </label>
            <input
              type="number"
              min={5}
              max={600}
              value={Math.round((config.agent?.timeoutMs || 120000) / 1000)}
              onChange={(e) => {
                const seconds = parseInt(e.target.value) || 120;
                updateAgentConfig({ timeoutMs: seconds * 1000 });
              }}
              className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">5-600 秒</p>
          </div>

          {/* 预算上限 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              单次最大预算（美元）
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={config.agent?.maxBudgetUsd || 0.5}
              onChange={(e) => {
                const budget = parseFloat(e.target.value) || 0.5;
                updateAgentConfig({ maxBudgetUsd: budget });
              }}
              className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">0-10 美元</p>
          </div>
        </div>

        {/* 权限模式 */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            权限模式
          </label>
          <select
            value={config.agent?.permissionMode || 'bypassPermissions'}
            onChange={(e) =>
              updateAgentConfig({
                permissionMode: e.target.value as 'bypassPermissions' | 'acceptEdits' | 'default' | 'dontAsk' | 'plan' | 'auto',
              })
            }
            className="w-full border-2 border-slate-600 bg-slate-800 text-slate-100 font-mono py-2 px-3 text-sm rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="bypassPermissions">绕过所有权限检查</option>
            <option value="acceptEdits">自动接受编辑操作</option>
            <option value="default">默认确认模式</option>
            <option value="dontAsk">不询问直接执行</option>
            <option value="plan">计划模式</option>
            <option value="auto">自动判断</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            控制 Claude Code 执行时的权限检查
          </p>
        </div>
      </div>
    </div>
  );
}
