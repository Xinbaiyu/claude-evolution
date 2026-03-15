import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import SourceManager from './pages/SourceManager';
import LearningReview from './pages/LearningReview';
import Toast from './components/Toast';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Simple client-side routing
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route to component mapping
  const renderPage = () => {
    switch (currentPath) {
      case '/learning-review':
        return <LearningReview />;
      case '/settings':
        return <Settings />;
      case '/source-manager':
        return <SourceManager />;
      case '/':
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {renderPage()}
      <Toast />
    </>
  );
}

export default App;
