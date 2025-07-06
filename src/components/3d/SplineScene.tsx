import React, { Suspense, useEffect, useState } from 'react';
import Spline from '@splinetool/react-spline';

interface SplineSceneProps {
  isInteractionDisabled?: boolean;
}

export const SplineScene: React.FC<SplineSceneProps> = ({
  isInteractionDisabled = false
}) => {
  const [key, setKey] = useState(0);
  const [sceneUrl, setSceneUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
    
    if (!baseUrl) {
      setError('Spline scene URL not configured. Please set VITE_SPLINE_SCENE_URL in your .env file.');
      return;
    }

    // Add timestamp parameter to force refresh and avoid cache issues
    const timestamp = Date.now();
    setSceneUrl(`${baseUrl}?v=${timestamp}`);
    setError(null);
  }, []);

  const handleSplineError = (error: unknown) => {
    console.error('Spline scene error:', error);
    setError('Failed to load 3D scene. The scene may be temporarily unavailable.');
    
    // Attempt to reload after a delay
    setTimeout(() => {
      const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
      if (baseUrl) {
        setKey(prev => prev + 1);
        const timestamp = Date.now();
        setSceneUrl(`${baseUrl}?v=${timestamp}`);
        setError(null);
      }
    }, 3000);
  };

  const handleSplineLoad = () => {
    console.log('Spline scene loaded successfully at:', new Date().toLocaleTimeString());
    setError(null);
  };

  // Force refresh function
  const forceRefresh = () => {
    const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
    if (baseUrl) {
      setKey(prev => prev + 1);
      const timestamp = Date.now();
      setSceneUrl(`${baseUrl}?v=${timestamp}`);
      setError(null);
    }
  };

  // Fallback gradient background
  const FallbackBackground = () => (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white">
        {error ? (
          <div className="space-y-4">
            <div className="text-lg font-light">{error}</div>
            {import.meta.env.VITE_SPLINE_SCENE_URL && (
              <button
                onClick={forceRefresh}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200"
              >
                Retry Loading Scene
              </button>
            )}
          </div>
        ) : (
          <div className="text-lg font-light animate-pulse">Preparing scene...</div>
        )}
      </div>
    </div>
  );

  // Show fallback if no URL configured or error occurred
  if (!sceneUrl || error) {
    return <FallbackBackground />;
  }

  return (
    <div className="fixed inset-0 z-0">
      {/* Debug refresh button - only show in development */}
      {import.meta.env.DEV && (
        <button
          onClick={forceRefresh}
          className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200 text-sm"
        >
          Refresh Scene
        </button>
      )}

      {/* Interaction disable overlay */}
      {isInteractionDisabled && (
        <div
          className="absolute inset-0 z-10 bg-transparent cursor-default"
          style={{
            pointerEvents: 'all',
            userSelect: 'none',
            touchAction: 'none'
          }}
          onMouseDown={(e) => e.preventDefault()}
          onMouseUp={(e) => e.preventDefault()}
          onMouseMove={(e) => e.preventDefault()}
          onClick={(e) => e.preventDefault()}
          onDoubleClick={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => e.preventDefault()}
          onKeyUp={(e) => e.preventDefault()}
          onKeyPress={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onTouchEnd={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
          tabIndex={-1}
        />
      )}

      <Suspense fallback={<FallbackBackground />}>
        <div
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: isInteractionDisabled ? 'none' : 'all',
            userSelect: isInteractionDisabled ? 'none' : 'auto',
            touchAction: isInteractionDisabled ? 'none' : 'auto'
          }}
        >
          <Spline
            key={key}
            scene={sceneUrl}
            style={{ width: '100%', height: '100%' }}
            onLoad={handleSplineLoad}
            onError={handleSplineError}
          />
        </div>
      </Suspense>
    </div>
  );
};