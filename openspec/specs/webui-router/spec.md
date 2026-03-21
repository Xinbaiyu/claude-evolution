# webui-router Specification

## Purpose
Client-side routing for the WebUI using React Router v7, providing SPA navigation, code-splitting via lazy loading, and URL-based page matching.

## Requirements

### Requirement: Route configuration with createBrowserRouter

The system SHALL define all application routes using React Router v7's `createBrowserRouter` API in a centralized route configuration file (`web/client/src/router.tsx`).

#### Scenario: Route configuration defines all pages
- **WHEN** the router configuration is loaded
- **THEN** it SHALL define routes for all existing pages:
  - `/` → Dashboard (index route)
  - `/learning-review` → LearningReview
  - `/analysis-logs` → AnalysisLogs
  - `/source-manager` → SourceManager
  - `/settings` → Settings

#### Scenario: Routes use a shared layout
- **WHEN** any route is matched
- **THEN** the route SHALL render within a root layout component that includes Navigation and Toast components

#### Scenario: Unknown routes show 404
- **WHEN** a user navigates to an undefined path (e.g., `/nonexistent`)
- **THEN** the system SHALL display a NotFound page with a link back to the dashboard

### Requirement: Lazy loading for route components

The system SHALL use React Router's `lazy()` route property to code-split page components, reducing initial bundle size.

#### Scenario: Page components are lazily loaded
- **WHEN** a user navigates to a route for the first time
- **THEN** the corresponding page component SHALL be loaded on demand via dynamic `import()`

#### Scenario: Dashboard loads eagerly
- **WHEN** the application initially loads
- **THEN** the Dashboard page SHALL be included in the main bundle (not lazy-loaded) since it is the landing page

### Requirement: Navigation using React Router primitives

The system SHALL replace `<a href>` tags and `window.history.pushState` with React Router's `<NavLink>` component for client-side navigation without full page reloads.

#### Scenario: Navigation links use NavLink
- **WHEN** the Navigation component renders navigation items
- **THEN** each item SHALL use `<NavLink to="...">` instead of `<a href="...">`

#### Scenario: Active route styling
- **WHEN** a NavLink's route matches the current URL
- **THEN** NavLink SHALL apply active styling classes via the `className` callback function

#### Scenario: No full page reload on navigation
- **WHEN** user clicks a navigation link
- **THEN** the browser SHALL NOT perform a full page reload; only the matched route's component SHALL re-render

### Requirement: URL parameter support for detail pages

The system SHALL support dynamic route segments for future detail views (e.g., `/analysis-logs/:runId`).

#### Scenario: Dynamic route segment matching
- **WHEN** a route is defined with a dynamic segment like `/analysis-logs/:runId`
- **THEN** the matched component SHALL receive the `runId` parameter via `useParams()` hook

#### Scenario: Programmatic navigation with parameters
- **WHEN** a component needs to navigate to a detail page (e.g., from analysis log list to detail)
- **THEN** it SHALL use the `useNavigate()` hook to perform client-side navigation

### Requirement: RouterProvider as application entry point

The system SHALL use `<RouterProvider>` as the top-level rendering component in `main.tsx`, replacing the current `<App />` component.

#### Scenario: Application renders with RouterProvider
- **WHEN** the application starts
- **THEN** `main.tsx` SHALL render `<RouterProvider router={router} />` where `router` is created by `createBrowserRouter`

#### Scenario: Server SPA fallback compatibility
- **WHEN** a user directly navigates to a deep link (e.g., `/settings`)
- **THEN** the Express server's existing SPA fallback (`res.sendFile('index.html')`) SHALL serve the app, and React Router SHALL handle the client-side route matching
