## Context

**Current State:**
- Init command located at `src/cli/commands/init.ts` (~500 lines)
- Currently prompts for 2 configuration areas: API mode (standard/CCR) and scheduler settings
- The planned `audit-and-enhance-init-command` change proposed adding 10-30+ prompts covering all ConfigSchema options
- ConfigSchema defines 80+ configuration options with sensible DEFAULT_CONFIG values
- WebUI at localhost:10010 already provides comprehensive configuration interface with visual feedback

**Problem:**
- Adding 10-30+ prompts makes init flow too long (5-15 minutes), degrading first-time user experience
- Complex parameters (Learning capacity tuning, promotion thresholds) are difficult to configure via CLI prompts
- Duplication: WebUI already provides better UX for advanced configuration (dropdowns, sliders, validation feedback)
- Most config options have good defaults - forcing users to make decisions upfront is premature

**Constraints:**
- Must not break existing config.json files (backward compatibility)
- Cannot modify ConfigSchema structure (only change init.ts implementation)
- Must support three LLM providers (Claude, OpenAI-Compatible, CCR)
- Users must be able to start the daemon immediately after init

**Stakeholders:**
- New users: Need fast, simple onboarding
- Advanced users: Want full control, prefer WebUI for complex tuning
- Maintainers: Want simpler, more maintainable init code

## Goals / Non-Goals

**Goals:**
- ✅ Reduce init prompts from planned 10-30+ to 3-5 questions
- ✅ Prompt only P0/P1 configs (LLM Provider, Scheduler, WebUI port) in init
- ✅ Provide defaults for all prompts (allow quick init via Enter key)
- ✅ Guide users to WebUI for P2 advanced configurations
- ✅ Maintain backward compatibility with existing configs
- ✅ Support all three LLM providers with minimal provider-specific prompts

**Non-Goals:**
- ❌ Not adding `--quick` or `--defaults` CLI flags (already simple enough)
- ❌ Not implementing port conflict detection (low probability, keep simple)
- ❌ Not modifying ConfigSchema or DEFAULT_CONFIG structure
- ❌ Not creating a GUI config tool (WebUI already exists)
- ❌ Not adding config migration logic (handled by config-loader)

## Decisions

### Decision 1: Three-tier configuration priority model

**Choice:** P0 (critical) / P1 (important) / P2 (advanced) classification

**Rationale:**
- P0: Only LLM Provider selection - system cannot start without knowing which API to use
- P1: Scheduler interval/timepoints + WebUI port - significant impact on first-run experience, but have defaults
- P2: All other configs - have sensible defaults, better configured in WebUI

**Alternatives Rejected:**
- Two-tier (essential/optional) - too coarse, doesn't distinguish between "important first-run" and "advanced tuning"
- Prompt all options - defeats the purpose of simplification
- Zero prompts with all defaults - doesn't let users choose provider or scheduling preference upfront

### Decision 2: Provider-specific prompt minimalism

**Choice:**
- Claude: No additional prompts (all defaults)
- OpenAI: Prompt only baseURL + model
- CCR: Prompt only baseURL

**Rationale:**
- API keys handled via environment variables (ANTHROPIC_API_KEY, OPENAI_API_KEY)
- Temperature/maxTokens/enablePromptCaching are tuning parameters - belong in WebUI
- Organization ID (OpenAI) rarely used, can be set in WebUI if needed
- BaseURL essential for OpenAI-Compatible (DeepSeek, Qwen, Azure) and CCR users
- Model name varies across OpenAI-compatible services, must be specified

**Alternatives Rejected:**
- Prompt all LLM params - makes init too long, duplicates WebUI functionality
- Don't prompt baseURL - breaks for non-standard OpenAI endpoints
- Prompt organization ID - rarely used, adds unnecessary question

### Decision 3: Scheduler configuration preserved

**Choice:** Keep existing 4-option scheduler prompt (24h/12h/6h/timepoints)

**Rationale:**
- Already implemented and working well
- Significantly impacts first-run experience (difference between 6h and 24h is noticeable)
- Timepoints mode (custom schedule) not discoverable if hidden in WebUI
- Only one question with clear options

**Alternatives Rejected:**
- Move to WebUI - hides important feature that affects daily usage
- Add more scheduler options - current 4 options cover all common cases

### Decision 4: Code structure refactoring

**New Structure:**
```typescript
src/cli/commands/init.ts
├── initCommand()              // Main flow
├── promptLLMProvider()        // P0: Provider selection with 3 options
├── promptScheduler()          // P1: Scheduler config (existing logic)
├── promptScheduleTimes()      // P1: Timepoints input & validation
├── promptWebUIPort()          // P1: Port configuration
├── printNextSteps()           // Enhanced completion message
├── createDirectoryStructure() // Existing
├── createDefaultTemplates()   // Existing
└── installSkillFiles()        // Existing
```

**Rationale:**
- Modular functions easier to test and maintain
- Clear separation between P0/P1 prompt logic
- Reuse existing directory/template/skill functions
- Single responsibility per function

**Alternatives Rejected:**
- Keep single 500-line function - hard to maintain and test
- Extract to separate files - overkill for this scope, adds indirection

### Decision 5: Completion message enhancement

**Choice:** Detailed next-steps message listing:
1. Provider-specific API key setup instructions
2. Daemon start command
3. WebUI URL with list of available P2 configurations

**Rationale:**
- Users need clear guidance on what to do next
- Different providers need different API key setup
- Explicitly listing WebUI configs improves discoverability of advanced features

**Example:**
```
✅ 初始化完成!

下一步:
1. 设置 API Key: export ANTHROPIC_API_KEY="sk-ant-xxx"
2. 启动守护进程: claude-evolution start
3. 打开 WebUI 进行更多配置: http://localhost:10010/settings
   可配置项:
   • Model 和 Temperature 调优
   • 学习容量和算法参数
   • 提醒系统 (桌面通知/Webhook)
   • 机器人集成 (钉钉/Claude Code)
   • 日志级别和其他高级选项
```

### Decision 6: Default values for all prompts

**Choice:** Every prompt has a sensible default in parentheses, allow Enter to accept

**Examples:**
- LLM Provider: `[1/2/3]: (默认: 1)` → Claude
- Scheduler: `[1/2/3/4]: (默认: 3)` → 6h
- Port: `(默认: 10010)` → 10010

**Rationale:**
- Enables quick init for users who trust defaults
- Reduces decision fatigue for new users
- Matches Unix CLI conventions

## Risks / Trade-offs

### Risk 1: Users may not discover P2 advanced features

**Mitigation:**
- Explicitly list all P2 configs in completion message
- Include WebUI URL prominently
- Consider adding `/config` command hint in daemon logs

### Risk 2: OpenAI baseURL/model prompts may confuse non-OpenAI users

**Mitigation:**
- Provide examples in prompt text: "例如 https://api.deepseek.com, https://api.openai.com"
- Include model examples: "例如 gpt-4-turbo, deepseek-chat, qwen-turbo"
- Document common providers in README

### Risk 3: Timepoints input validation may block users

**Mitigation:**
- Clear error messages with examples
- Allow re-entry without exiting init
- Maximum 12 timepoints enforced with clear reason

### Risk 4: Port 10010 conflict (low probability)

**Trade-off:** Not implementing conflict detection
- **Pro:** Keeps code simple, avoids false positives
- **Con:** If conflict occurs, user must manually edit config.json or use different port in init
- **Accepted:** Conflict probability is low (10010 not a common service port), manual fix acceptable

### Risk 5: Re-initialization overwrites custom WebUI configs

**Mitigation:**
- Prompt "Re-initialize? (y/N)" before overwriting
- Clearly warn that re-init will replace existing config
- Document that `config set` can update individual fields without re-init

## Migration Plan

**Deployment Steps:**
1. Implement changes in feature branch
2. Test all 6 scenarios (see Verification Plan below)
3. Update README with new init flow documentation
4. Merge to main branch
5. Release new version

**Rollback Strategy:**
- Config file format unchanged - no data migration needed
- If init broken, users can manually create config.json from template
- Can revert commit and release hotfix

**Backward Compatibility:**
- Existing config.json files remain valid
- Users can re-run init to upgrade config
- No automatic migration required

## Open Questions

**Q1: Should we validate baseURL reachability during init?**
- Pro: Catch typos early, provide immediate feedback
- Con: Adds network dependency to init, slows down process, may fail in restricted networks
- **Recommendation:** Skip validation, rely on daemon startup error for feedback

**Q2: Should we add a "skip all prompts" mode for Docker/CI use cases?**
- Current decision: Not adding `--quick` flag
- **Alternative:** Document how to pre-create config.json and skip init entirely
- **Defer:** Can add later if user demand exists

**Q3: Should WebUI port prompt happen before or after scheduler prompt?**
- Current order: LLM → Scheduler → Port
- **Recommendation:** Keep current order - port is least critical, put at end
