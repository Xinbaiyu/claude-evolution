## 1. Backend - Config Schema

- [ ] 1.1 Add `AgentConfigSchema` to `src/config/schema.ts` with fields: baseURL, defaultCwd, allowedDirs, timeoutMs, maxBudgetUsd, permissionMode
- [ ] 1.2 Add `agent` field to `ConfigSchema` with `AgentConfigSchema` type
- [ ] 1.3 Export `AgentConfig` type from schema
- [ ] 1.4 Update `DEFAULT_CONFIG` to include default `agent` configuration
- [ ] 1.5 Mark `BotCCSchema` as deprecated with JSDoc comment

## 2. Backend - Config Migration

- [ ] 2.1 Implement `migrateAgentConfig()` function in `src/config/loader.ts`
- [ ] 2.2 Add migration logic: if `bot.cc` exists and `agent` does not, migrate values
- [ ] 2.3 Add warning log when migration occurs
- [ ] 2.4 Add warning log when both `bot.cc` and `agent` exist
- [ ] 2.5 Call migration function in `loadConfig()` before validation
- [ ] 2.6 Persist migrated config to disk after migration

## 3. Backend - Unit Tests for Migration

- [ ] 3.1 Write test: migration occurs when bot.cc exists and agent does not
- [ ] 3.2 Write test: migration skipped when agent already exists
- [ ] 3.3 Write test: no migration when bot.cc does not exist
- [ ] 3.4 Write test: migrated config matches bot.cc values
- [ ] 3.5 Write test: warning logged when both configs exist

## 4. Backend - Update Agent Execution Callsites

- [ ] 4.1 Update `src/bot/commands/cc-bridge.ts` to read from `config.agent` instead of `config.bot.cc`
- [ ] 4.2 Add fallback logic: try `config.agent` first, then `config.bot?.cc` for backward compatibility
- [ ] 4.3 Verify `executeCC()` call passes correct parameters from `config.agent`

## 5. Frontend - Agent Execution Component

- [ ] 5.1 Create `web/client/src/components/AgentExecutionConfig.tsx` component file
- [ ] 5.2 Implement mode selector UI (radio buttons: 原生 Claude, CCR 代理)
- [ ] 5.3 Implement conditional baseURL input (shown only when CCR selected)
- [ ] 5.4 Implement common config fields: defaultCwd, allowedDirs, timeoutMs, maxBudgetUsd, permissionMode
- [ ] 5.5 Use Ant Design components consistent with LLMProviderConfig
- [ ] 5.6 Add JSDoc description: "钉钉任务、定时调研等都使用此配置"

## 6. Frontend - Settings Page Updates

- [ ] 6.1 Import `AgentExecutionConfig` component in `Settings.tsx`
- [ ] 6.2 Add `'agent'` to `TabType` union type
- [ ] 6.3 Add "Agent 执行" tab button in navigation (between "LLM 提供商" and "增量学习")
- [ ] 6.4 Add tab content section rendering `<AgentExecutionConfig />` when `activeTab === 'agent'`
- [ ] 6.5 Rename "Claude 模型" tab to "LLM 提供商" (line ~200)
- [ ] 6.6 Remove "Claude Code 桥接" section from "通知通道" tab (lines 688-824)

## 7. Frontend - Type Definitions

- [ ] 7.1 Update `web/client/src/api/client.ts` Config type to include `agent` field
- [ ] 7.2 Ensure `agent` type matches backend AgentConfig schema

## 8. Integration Testing

- [ ] 8.1 Test: Load config with old `bot.cc` structure, verify migration to `agent`
- [ ] 8.2 Test: Save new `agent` config from WebUI, verify persistence
- [ ] 8.3 Test: DingTalk bot executes with `config.agent.baseURL = null` (native Claude)
- [ ] 8.4 Test: DingTalk bot executes with `config.agent.baseURL = "http://localhost:3456"` (CCR)
- [ ] 8.5 Test: WebUI displays correct values when switching between native/CCR modes

## 9. Documentation

- [ ] 9.1 Update `README.md` with new `agent` config structure
- [ ] 9.2 Add migration note: "Existing `bot.cc` configs will auto-migrate"
- [ ] 9.3 Document `baseURL` field: null = native Claude, URL = CCR/proxy
- [ ] 9.4 Add example config JSON showing `agent` structure

## 10. Cleanup (Future - After 3 Versions)

- [ ] 10.1 Remove `BotCCSchema` from `config/schema.ts`
- [ ] 10.2 Remove migration logic from `config/loader.ts`
- [ ] 10.3 Remove fallback logic from `cc-bridge.ts`
- [ ] 10.4 Remove migration tests
