import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  const Component = onClick ? motion.div : 'div';
  
  return (
    <Component
      className={`
        bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...(onClick && {
        whileHover: { scale: 1.02, y: -2 },
        whileTap: { scale: 0.98 },
        transition: { type: 'spring', stiffness: 400, damping: 17 }
      })}
    >
      {children}
    </Component>
  );
};