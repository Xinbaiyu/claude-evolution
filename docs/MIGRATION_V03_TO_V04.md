# Migration Guide: v0.3.0 to v0.4.0

## Overview

Version 0.4.0 removes the legacy suggestion system (pending/approved/rejected workflow) that was deprecated in v0.3.0. The observation-based learning system introduced in v0.3.0 is now the only learning mechanism.

## Breaking Changes

### Removed Components

#### CLI Commands
- `claude-evolution approve <id>` - **REMOVED**
- `claude-evolution reject <id>` - **REMOVED**
- `claude-evolution review` - **REPLACED** with WebUI Learning Review
- `claude-evolution history` - **REMOVED**

#### API Endpoints
- `GET /api/suggestions` - **REMOVED**
- `GET /api/suggestions/:id` - **REMOVED**
- `POST /api/suggestions/:id/approve` - **REMOVED**
- `POST /api/suggestions/:id/reject` - **REMOVED**
- `POST /api/suggestions/batch/approve` - **REMOVED**
- `POST /api/suggestions/batch/reject` - **REMOVED**

#### Data Files
- `~/.claude-evolution/suggestions/pending.json` - **DEPRECATED**
- `~/.claude-evolution/suggestions/approved.json` - **DEPRECATED**
- `~/.claude-evolution/suggestions/rejected.json` - **DEPRECATED**

New location:
- `~/.claude-evolution/learned/active.json` - Active observation pool
- `~/.claude-evolution/learned/context.json` - Context observation pool
- `~/.claude-evolution/learned/archived.json` - Archived observations

### Updated Components

#### WebUI
- **Dashboard**: Suggestion stats are now optional and will show 0 if unavailable
- **Review Page**: Now redirects to `/learning-review`
- **Learning Review**: Use this for managing observations (promote/demote/archive)

#### Configuration
The `learningPhases.suggestion` config field is retained for phase calculation but no longer triggers the manual approval workflow.

## Migration Steps

### Step 1: Backup Your Data (IMPORTANT)

```bash
# Backup old suggestion data
cp -r ~/.claude-evolution/suggestions ~/.claude-evolution/suggestions.backup

# Backup learned content
cp -r ~/.claude-evolution/learned ~/.claude-evolution/learned.backup
```

### Step 2: Run Migration Script

```bash
claude-evolution migrate-suggestions
```

This will:
1. Convert `pending.json` suggestions to `active.json` observations
2. Create backup at `pending.json.backup-YYYYMMDD`
3. Create marker file `.migrated` to prevent re-running

### Step 3: Verify Migration

```bash
# Check observation pools
claude-evolution status

# Or use WebUI
open http://localhost:10010/learning-review
```

### Step 4: Update Workflows

**Before (v0.3.0)**:
```bash
claude-evolution review      # Review suggestions in terminal
claude-evolution approve <id>  # Approve suggestion
claude-evolution reject <id>   # Reject suggestion
```

**After (v0.4.0)**:
```bash
# Use WebUI instead
open http://localhost:10010/learning-review

# Or check status
claude-evolution status
```

### Step 5: Clean Up (Optional)

After verifying everything works:

```bash
# Remove old suggestion files (optional - keep backups!)
rm -rf ~/.claude-evolution/suggestions
```

## New Features in v0.4.0

### Observation Lifecycle
1. **Active Pool**: Candidates under consideration
   - Tiered confidence (Gold/Silver/Bronze)
   - Auto-promotion after sustained confidence
2. **Context Pool**: Proven patterns in use
   - Included in CLAUDE.md
   - Decay mechanism to remove stale patterns
3. **Archived Pool**: Deprecated observations
   - Removed from active learning
   - Kept for historical reference

### WebUI Learning Review
- Visual tier badges (🥇 Gold, 🥈 Silver, 🥉 Bronze)
- Manual overrides (promote/demote/archive)
- Batch operations support
- Real-time pool statistics

### Intelligent Merging
- Similar observations automatically merged
- Confidence boosted by repeated evidence
- Prevents duplicate learning

## Troubleshooting

### Migration Script Fails

**Error**: `pending.json not found`
- **Solution**: No migration needed - you're already on v0.3.0+ format

**Error**: `.migrated marker exists`
- **Solution**: Migration already completed
- **Override**: Delete `.migrated` file and re-run (not recommended)

### Missing Observations After Migration

Check backup file:
```bash
ls -la ~/.claude-evolution/suggestions/pending.json.backup-*
```

Restore if needed:
```bash
# Remove marker
rm ~/.claude-evolution/learned/.migrated

# Restore backup
cp ~/.claude-evolution/suggestions/pending.json.backup-YYYYMMDD ~/.claude-evolution/suggestions/pending.json

# Re-run migration
claude-evolution migrate-suggestions
```

### WebUI Shows No Observations

1. Check pools exist:
   ```bash
   ls ~/.claude-evolution/learned/
   ```

2. Verify status:
   ```bash
   claude-evolution status
   ```

3. Run analysis to generate new observations:
   ```bash
   claude-evolution analyze --now
   ```

## API Changes for Developers

If you built tools on top of claude-evolution APIs:

### Removed TypeScript Types
```typescript
// DEPRECATED - moved to src/types/legacy.ts
interface Suggestion { ... }
interface Preference { ... }
interface Pattern { ... }
interface Workflow { ... }
```

### New Types
```typescript
import { ObservationWithMetadata } from './types/learning.js';

interface ObservationWithMetadata {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'preference' | 'pattern' | 'workflow';
  confidence: number;
  evidence: string[];
  item: Preference | Pattern | Workflow;

  // Lifecycle metadata
  mentions: number;
  lastSeen: string;
  firstSeen: string;
  originalConfidence: number;
  inContext: boolean;
  tier?: 'gold' | 'silver' | 'bronze';
  manualOverride?: 'promoted' | 'demoted' | 'ignored';
}
```

## Rollback Instructions

If you need to rollback to v0.3.0:

```bash
# 1. Stop daemon
claude-evolution stop

# 2. Restore backup
rm -rf ~/.claude-evolution/learned
mv ~/.claude-evolution/learned.backup ~/.claude-evolution/learned

# 3. Reinstall v0.3.0
npm install -g claude-evolution@0.3.0

# 4. Restart
claude-evolution start --daemon
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/claude-evolution/issues
- Documentation: https://github.com/your-repo/claude-evolution/docs
