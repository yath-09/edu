// src/App.tsx
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { ExploreView } from './components/Explore/ExploreView';
import { PlaygroundView } from './components/Playground/PlaygroundView';
import { TestView } from './components/Test/TestView';
import { Toast } from './components/shared/Toast';
import { Loading } from './components/shared/Loading';
import { storageService } from './services/storageService';

type Mode = 'playground' | 'explore' | 'test';

export const App = () => {
  const [mode, setMode] = useState<Mode>('playground'); // Default to playground
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Check user info and other initializations
    const init = async () => {
      const hasUser = storageService.hasUser();
      if (!hasUser) {
        // Handle new user setup if needed
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleError = (message: string) => {
    setToast({ type: 'error', message });
  };

  const handleSuccess = (message: string) => {
    setToast({ type: 'success', message });
  };

  const handleRelatedQueryClick = (query: string) => {
    setMode('explore');
    // The query will be handled by the ExploreView component
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Layout 
        currentMode={mode} 
        onModeChange={setMode}
        onRelatedQueryClick={handleRelatedQueryClick}
      >
        {mode === 'playground' && (
          <PlaygroundView
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}
        {mode === 'explore' && (
          <ExploreView
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}
        {mode === 'test' && (
          <TestView
            onError={handleError}
            onSuccess={handleSuccess}
          />
        )}
      </Layout>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default App;