## Why

claude-evolution currently operates entirely through CLI commands, requiring users to manually run `claude-evolution review` to check for new suggestions. This creates a friction point: users don't know when analysis completes or when new suggestions are ready for review. A Web UI with real-time notifications will provide immediate feedback, better visualization of suggestions and evidence, and a more intuitive management experience.

## What Changes

- Add Express.js-based web server that serves a React dashboard
- Create RESTful API layer for accessing suggestions, configuration, and system status
- Implement WebSocket server for real-time data synchronization between frontend and backend
- Implement system-level desktop notifications using node-notifier (works regardless of browser state)
- Build React frontend with four core pages: Dashboard, Review, History, Settings
- Add `claude-evolution start` command that launches both the scheduler daemon and web server
- Add configurable web server port (default: 10010)
- Notification click behavior: automatically open browser and navigate to relevant page

## Capabilities

### New Capabilities
- `web-server`: HTTP/WebSocket server that exposes REST API and serves static frontend assets
- `web-api`: RESTful API endpoints for accessing suggestions, configuration, scheduler status
- `web-ui-dashboard`: Dashboard page showing system status, metrics cards, and recent activity
- `web-ui-review`: Interactive suggestion review page with approve/reject actions and evidence display
- `web-ui-settings`: Configuration management interface for scheduler, LLM, and notification settings
- `web-ui-history`: Historical view of approved/rejected suggestions with timeline visualization
- `realtime-notifications`: WebSocket-based notification system for analysis events and new suggestions
- `daemon-mode`: Background process management for running scheduler + web server together

### Modified Capabilities
- `cli-commands`: Add `start`, `stop`, `status` commands for daemon/web server management; existing commands remain unchanged

## Impact

**Code Structure:**
- New `web/` directory containing `server/` (Express API) and `client/` (React app)
- CLI command extensions in `src/cli/commands/`
- New dependencies: `express`, `ws`, `node-notifier`, `react`, `vite`, `tailwind`, etc.

**Configuration:**
- New `config.json` fields: `webServer.enabled`, `webServer.port`, `notifications.desktop`

**User Workflow:**
- Users run `claude-evolution start` instead of relying on manual `analyze --now`
- System notifications appear on desktop when analysis completes (works even if browser is closed)
- Clicking notification opens browser and navigates to the relevant page (e.g., /review for new suggestions)
- CLI commands remain fully functional for users who prefer terminal-only workflow

**Backward Compatibility:**
- All existing CLI commands continue to work
- Web UI is opt-in (users can still use pure CLI mode)
- Configuration schema extends, doesn't break
