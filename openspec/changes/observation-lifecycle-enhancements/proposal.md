## Why

The current observation lifecycle has three critical gaps: (1) LLM merge can overwrite user ignore decisions when similar observations appear, violating user intent; (2) users cannot recover observations they previously ignored, forcing them to recreate lost knowledge; (3) Context Pool has no capacity management, risking unbounded growth and degraded performance as CLAUDE.md grows indefinitely. These gaps reduce system reliability and user trust.

## What Changes

- **LLM Merge Protection**: When merging observations, detect similarity to previously ignored observations and automatically inherit the ignore state, preventing unwanted resurrection of dismissed patterns
- **Unignore Functionality**: Add Archive Pool management UI and API endpoints allowing users to restore previously ignored observations to Active or Context pools
- **Context Pool Capacity Management**: Implement temporal decay and capacity limits for Context Pool with configurable thresholds, automatic archival of low-scoring observations, and pinning functionality to protect critical observations
- **Enhanced Manual Override Tracking**: Extend `manualOverride` metadata to track inheritance chain when ignore states are propagated through merges
- **Archive Reason Granularity**: Distinguish between `active_capacity` and `context_capacity` archive reasons for better traceability

## Capabilities

### New Capabilities

- `llm-merge-ignore-protection`: LLM merge respects and inherits ignore states from archived observations to prevent overwriting user decisions
- `archive-pool-restoration`: Users can restore observations from Archive Pool to Active or Context pools through Web UI and API
- `context-pool-capacity`: Context Pool enforces configurable capacity limits using temporal decay scoring and automatic archival
- `observation-pinning`: Users can pin critical observations in Context Pool to protect them from automatic removal
- `capacity-config-ui`: Web UI Settings page provides controls for Context Pool capacity parameters (maxSize, targetSize, halfLifeDays)

### Modified Capabilities

- `learning-cycle`: Learning orchestrator now includes Context Pool capacity control step after auto-promotion
- `observation-metadata`: Extended to support pinning flags, merge inheritance tracking, and granular archive reasons

## Impact

**Code Changes:**
- `src/learners/llm-merge.ts`: Add similarity detection against ignored observations and state inheritance logic
- `src/memory/capacity-control.ts`: Extract shared capacity logic and create `enforceContextCapacity()` variant
- `src/memory/learning-orchestrator.ts`: Add Context Pool capacity control step in learning cycle
- `src/types/learning.ts`: Extend `ObservationWithMetadata` and `CapacityConfig` types
- `web/server/routes/learning.ts`: Add unignore endpoints (single + batch), pin/unpin endpoints
- `web/client/src/pages/Archive.tsx`: New Archive Pool management UI with restore functionality
- `web/client/src/pages/Settings.tsx`: Add Context Pool capacity configuration section
- `web/client/src/components/ObservationCard.tsx`: Add pin button and visual indicator

**Data Structure:**
- New `ObservationWithMetadata` fields: `pinned`, `pinnedBy`, `pinnedAt`, `mergeInfo`, extended `manualOverride.inheritedFrom`
- New `ContextCapacityConfig` interface in config schema
- Archive reasons extended: `active_capacity`, `context_capacity`

**Configuration:**
- `~/.claude-evolution/config.json`: Add `learning.capacity.context` section with `targetSize`, `maxSize`, `halfLifeDays`, `enabled`

**Risks:**
- Backward compatibility: Existing observations without new fields must be handled gracefully
- Performance: Context Pool capacity enforcement runs in learning cycle - ensure <500ms overhead
- User education: Need clear UI messaging about pinning limits and capacity behavior
