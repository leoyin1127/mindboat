import React, { Suspense, useEffect, useState, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const validateSceneUrl = useCallback((url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'prod.spline.design' && url.includes('.splinecode');
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
    
    if (!baseUrl) {
      setError('Spline scene URL not configured. Please set VITE_SPLINE_SCENE_URL in your .env file.');
      setIsLoading(false);
      return;
    }

    if (!validateSceneUrl(baseUrl)) {
      setError('Invalid Spline scene URL format. Please ensure it points to a valid .splinecode file.');
      setIsLoading(false);
      return;
    }

    // Add timestamp parameter to force refresh and avoid cache issues
    const timestamp = Date.now();
    setSceneUrl(`${baseUrl}?v=${timestamp}`);
    setError(null);
    setIsLoading(true);
  }, [validateSceneUrl]);

  const handleSplineError = useCallback((error: unknown) => {
    console.error('Spline scene error:', error);
    setIsLoading(false);
    
    // Check if this is the specific "Missing property" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Missing property') || errorMessage.includes('buildTimeline')) {
      setError('The 3D scene appears to be corrupted or incompatible. Please check if the scene needs to be re-exported from Spline.');
    } else {
      setError('Failed to load 3D scene. The scene may be temporarily unavailable.');
    }
    
    // Attempt to reload after a delay, but limit retries
    if (retryCount < maxRetries) {
      setTimeout(() => {
        const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
        if (baseUrl && validateSceneUrl(baseUrl)) {
          setRetryCount(prev => prev + 1);
          setKey(prev => prev + 1);
          const timestamp = Date.now();
          setSceneUrl(`${baseUrl}?v=${timestamp}`);
          setError(null);
          setIsLoading(true);
        }
      }, 3000 * (retryCount + 1)); // Exponential backoff
    }
  }, [retryCount, maxRetries, validateSceneUrl]);

  const handleSplineLoad = useCallback(() => {
    console.log('Spline scene loaded successfully at:', new Date().toLocaleTimeString());
    setError(null);
    setIsLoading(false);
    
    // Check if this is the specific "Missing property" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Missing property') || errorMessage.includes('buildTimeline')) {
      setError('The 3D scene appears to be corrupted or incompatible. Please check if the scene needs to be re-exported from Spline.');
    } else {
      setError('Failed to load 3D scene. The scene may be temporarily unavailable.');
    }
    
    // Attempt to reload after a delay, but limit retries
    if (retryCount < maxRetries) {
      setTimeout(() => {
        const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
        if (baseUrl && validateSceneUrl(baseUrl)) {
          setRetryCount(prev => prev + 1);
          setKey(prev => prev + 1);
          const timestamp = Date.now();
          setSceneUrl(`${baseUrl}?v=${timestamp}`);
          setError(null);
          setIsLoading(true);
        }
      }, 3000 * (retryCount + 1)); // Exponential backoff
    }
    setRetryCount(0); // Reset retry count on successful load
  }, [retryCount, maxRetries, validateSceneUrl]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    const baseUrl = import.meta.env.VITE_SPLINE_SCENE_URL;
    if (baseUrl && validateSceneUrl(baseUrl)) {
      setKey(prev => prev + 1);
      setRetryCount(0);
      setRetryCount(0);
      const timestamp = Date.now();
      setSceneUrl(`${baseUrl}?v=${timestamp}`);
      setError(null);
      setIsLoading(true);
    }
  }, [validateSceneUrl]);

  // Fallback gradient background
  const FallbackBackground = () => (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto px-6">
        {error ? (
          <div className="space-y-4">
            <div className="text-lg font-light">{error}</div>
            {retryCount < maxRetries && (
              <div className="text-sm text-white/70">
                Retry attempt {retryCount + 1} of {maxRetries}
              </div>
            )}
            {retryCount < maxRetries && (
              <div className="text-sm text-white/70">
                Retry attempt {retryCount + 1} of {maxRetries}
              </div>
            )}
            {import.meta.env.VITE_SPLINE_SCENE_URL && (
              <button
                onClick={forceRefresh}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Retry Loading Scene'}
              </button>
            )}
            {retryCount >= maxRetries && (
              <div className="text-sm text-white/70 mt-4">
                <p>If this issue persists, please:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                  <li>Check that your Spline scene is published and accessible</li>
                  <li>Try re-exporting the scene from Spline</li>
                  <li>Verify the scene URL in your .env file</li>
                </ul>
              </div>
            )}
            {retryCount >= maxRetries && (
              <div className="text-sm text-white/70 mt-4">
                <p>If this issue persists, please:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                  <li>Check that your Spline scene is published and accessible</li>
                  <li>Try re-exporting the scene from Spline</li>
                  <li>Verify the scene URL in your .env file</li>
                </ul>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="text-lg font-light animate-pulse">Preparing scene...</div>
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="text-lg font-light">Scene ready</div>
        )}
      </div>
    </div>
  );

  // Show fallback if no URL configured, error occurred, or still loading
  if (!sceneUrl || error || isLoading) {
    return <FallbackBackground />;
  }

  return (
    <div className="fixed inset-0 z-0">
      {/* Debug refresh button - only show in development */}
      {import.meta.env.DEV && (
        <button
          onClick={forceRefresh}
          className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200 text-sm"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh Scene'}
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