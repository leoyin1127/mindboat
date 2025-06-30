import React from 'react';
import { motion } from 'framer-motion';
import { designSystem, getPanelStyle } from '../../styles/designSystem';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  blur = '2xl',
  onClick,
  hover = false,
}) => {
  const panelStyle = getPanelStyle(blur);
  
  return (
    <motion.div
      onClick={onClick}
      className={`${panelStyle} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={hover ? { scale: 1.02 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Inner glow overlay */}
      <div className={designSystem.patterns.innerGlow}></div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};