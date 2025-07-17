import React, { Suspense, useEffect, useState, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

interface SplineSceneProps {
  isInteractionDisabled?: boolean;
}

export const SplineScene: React.FC<SplineSceneProps> = ({ 
  isInteractionDisabled = false 
}) => {
  const [key, setKey] = useState(0);
  const [sceneUrl, setSceneUrl] = useState('');
  const splineRef = useRef<Application | null>(null);

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

  const handleSplineLoad = (splineApp: Application) => {
    console.log('Spline scene loaded successfully at:', new Date().toLocaleTimeString());
    splineRef.current = splineApp;
    
    // 监听 Spline 场景中的鼠标事件
    splineApp.addEventListener('mouseDown', async (e) => {
      console.log('Spline mouseDown event:', e);
      
      // 检查点击的对象名称
      if (e.target && e.target.name) {
        console.log('Clicked object name:', e.target.name);
        
        // 根据不同的对象名称调用不同的云函数
        // 这里需要根据你的 Spline 场景中按钮的实际名称来修改
        let webhookUrl = '';
        let payload = {};
        
        // 示例：根据按钮名称决定调用哪个云函数
        if (e.target.name.toLowerCase().includes('goal') || 
            e.target.name.toLowerCase().includes('button1')) {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-webhook`;
          payload = { number: 1 };
        } else if (e.target.name.toLowerCase().includes('welcome') ||
                   e.target.name.toLowerCase().includes('button2')) {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/welcome-webhook`;
          payload = { number: 2 };
        } else if (e.target.name.toLowerCase().includes('journey') || 
                   e.target.name.toLowerCase().includes('button3')) {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journey-webhook`;
          payload = { number: 3 };
        } else if (e.target.name.toLowerCase().includes('seagull') || 
                   e.target.name.toLowerCase().includes('button5')) {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seagull-webhook`;
          payload = { numbaer5: 0 };
        }
        
        // 如果找到了对应的 webhook，就发送请求
        if (webhookUrl) {
          try {
            console.log(`Calling webhook: ${webhookUrl} with payload:`, payload);
            
            const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(payload)
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('Webhook response:', data);
            } else {
              console.error('Webhook call failed:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('Error calling webhook:', error);
          }
        }
      }
    });
  };

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