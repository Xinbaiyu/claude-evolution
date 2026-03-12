import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import Settings from './pages/Settings';

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
      case '/review':
        return <Review />;
      case '/settings':
        return <Settings />;
      case '/':
      default:
        return <Dashboard />;
    }
  };

  return renderPage();
}

export default App;
