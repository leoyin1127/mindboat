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

  useEffect(() => {
    // 添加时间戳参数强制刷新
    const timestamp = Date.now();
    const baseUrl = 'https://prod.spline.design/edOeRvrcuWyGaD41/scene.splinecode';
    setSceneUrl(`${baseUrl}?v=${timestamp}`);
  }, []);

  const handleSplineError = (error: any) => {
    console.error('Spline scene error:', error);
    // 如果加载失败，尝试重新加载
    setTimeout(() => {
      setKey(prev => prev + 1);
      const timestamp = Date.now();
      const baseUrl = 'https://prod.spline.design/edOeRvrcuWyGaD41/scene.splinecode';
      setSceneUrl(`${baseUrl}?v=${timestamp}`);
    }, 2000);
  };

  const handleSplineLoad = () => {
    console.log('Spline scene loaded successfully at:', new Date().toLocaleTimeString());
  };

  // 强制刷新函数
  const forceRefresh = () => {
    setKey(prev => prev + 1);
    const timestamp = Date.now();
    const baseUrl = 'https://prod.spline.design/edOeRvrcuWyGaD41/scene.splinecode';
    setSceneUrl(`${baseUrl}?v=${timestamp}`);
  };

  if (!sceneUrl) {
    return (
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-lg font-light animate-pulse">Preparing scene...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0">
      {/* 刷新按钮 - 用于调试 */}
      <button
        onClick={forceRefresh}
        className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200"
      >
        刷新场景
      </button>

      {/* 交互禁用遮罩层 - 当模态框打开时阻止Spline交互 */}
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

      <Suspense fallback={
        <div className="w-full h-full bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
          <div className="text-white text-lg font-light animate-pulse">Loading the ocean...</div>
        </div>
      }>
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
            key={key} // 使用key强制重新渲染
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