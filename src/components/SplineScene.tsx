import React, { Suspense, useEffect, useState, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';
import { AnonymousUser } from '../lib/auth';

interface SplineSceneProps {
  isInteractionDisabled?: boolean;
  currentUser?: AnonymousUser | null;
}

export const SplineScene: React.FC<SplineSceneProps> = ({ 
  isInteractionDisabled = false,
  currentUser
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
        
        // Map Spline object names to webhooks
        const objectName = e.target.name;
        const lowerName = objectName.toLowerCase();
        
        // Goals webhook mappings (A1, D3.1)
        if (lowerName.includes('goal') || 
            lowerName.includes('button1') ||
            objectName === 'A1' || objectName === 'D3.1' || objectName === 'Goals') {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/goals-webhook`;
          payload = { number: 1, user_id: currentUser?.id };
        } 
        // Welcome webhook mappings (A3 only)
        else if (lowerName.includes('welcome') ||
                 lowerName.includes('button2') ||
                 objectName === 'A3' || objectName === 'Welcome') {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/welcome-webhook`;
          payload = { number: 2, user_id: currentUser?.id };
        } 
        // Journey webhook mappings (A4)
        else if (lowerName.includes('journey') || 
                 lowerName.includes('button3') ||
                 objectName === 'A4' || objectName === 'Journey' || objectName === 'Start') {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journey-webhook`;
          payload = { number: 3, user_id: currentUser?.id };
        } 
        // Seagull webhook mappings (A5)
        else if (lowerName.includes('seagull') || 
                 lowerName.includes('button5') ||
                 objectName === 'A5' || objectName === 'Seagull' || objectName === 'Bird') {
          webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seagull-webhook`;
          payload = { numbaer5: 0, user_id: currentUser?.id };
        }
        
        // Log the mapping result
        if (webhookUrl) {
          console.log(`✅ Mapped "${objectName}" to webhook: ${webhookUrl.split('/').pop()}`);
        } else {
          console.log(`❌ No webhook mapping found for object: "${objectName}"`);
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