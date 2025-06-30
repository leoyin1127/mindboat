import React from 'react';
import { motion } from 'framer-motion';
import { designSystem } from '../../styles/designSystem';

interface InputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number';
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  className = '',
  autoFocus = false,
}) => {
  return (
    <motion.input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`${designSystem.patterns.inputField} p-4 w-full ${className}`}
      whileFocus={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    />
  );
};