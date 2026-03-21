import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'learning-review',
        lazy: () => import('./pages/LearningReview').then(m => ({ Component: m.default })),
      },
      {
        path: 'analysis-logs',
        lazy: () => import('./pages/AnalysisLogs').then(m => ({ Component: m.default })),
      },
      {
        path: 'source-manager',
        lazy: () => import('./pages/SourceManager').then(m => ({ Component: m.default })),
      },
      {
        path: 'settings',
        lazy: () => import('./pages/Settings').then(m => ({ Component: m.default })),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
