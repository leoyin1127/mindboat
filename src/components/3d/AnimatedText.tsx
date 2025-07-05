import React, { useEffect, useRef, useState } from 'react';

interface AnimatedTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  triggerOnScroll?: boolean;
  mouseTracking?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  delay = 0,
  className = '',
  triggerOnScroll = false,
  mouseTracking = false
}) => {
  const [isVisible, setIsVisible] = useState(!triggerOnScroll);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (triggerOnScroll && textRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
          }
        },
        { threshold: 0.3 }
      );

      observer.observe(textRef.current);
      return () => observer.disconnect();
    }
  }, [triggerOnScroll, delay]);

  useEffect(() => {
    if (mouseTracking) {
      const handleMouseMove = (e: MouseEvent) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const x = (e.clientX - centerX) / centerX;
        const y = (e.clientY - centerY) / centerY;
        setMousePosition({ x: x * 20, y: y * 20 });
      };

      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseTracking]);

  return (
    <div
      ref={textRef}
      className={`transition-all duration-1000 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : 50}px) translateX(${mousePosition.x}px) translateY(${mousePosition.y}px)`,
        textShadow: isVisible ? '0 0 20px rgba(255,255,255,0.3)' : 'none'
      }}
    >
      {children}
    </div>
  );
};