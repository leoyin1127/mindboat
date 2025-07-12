import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMessage(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleModeToggle = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setSuccessMessage('Please check your email for a confirmation link to complete your registration.');
        } else {
          setSuccessMessage('Account created successfully!');
          setTimeout(() => {
            handleClose();
          }, 2000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMessage('Login successful!');
          setTimeout(() => {
            handleClose();
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-3xl">
      {/* Ultra subtle inner glow overlay across entire screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Content container - centered */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="relative max-w-md w-full">
          
          {/* Main glass panel with Apple-inspired styling */}
          <div className="relative bg-gradient-to-br from-white/12 via-white/8 to-white/6 
                          backdrop-blur-2xl border border-white/20 rounded-3xl p-8
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white/90 
                         transition-colors duration-200 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-400/40 to-blue-600/40 
                                rounded-2xl p-3 backdrop-blur-md border border-white/40 
                                shadow-lg shadow-blue-500/20">
                  <User className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-playfair font-normal text-white mb-2">
                {mode === 'login' ? 'Welcome Back' : 'Join The Journey'}
              </h2>
              
              <p className="text-white/70 text-sm font-inter">
                {mode === 'login' 
                  ? 'Sign in to continue your voyage of self-discovery' 
                  : 'Create an account to begin your mindful journey'
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {/* Email field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-white/50" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-12 pr-4 py-3 bg-black/15 backdrop-blur-md 
                             border border-white/25 rounded-xl text-white placeholder-white/50
                             focus:outline-none focus:ring-2 focus:ring-white/30 
                             focus:border-white/40 transition-all duration-300
                             font-inter text-sm
                             shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  required
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/50" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-3 bg-black/15 backdrop-blur-md 
                             border border-white/25 rounded-xl text-white placeholder-white/50
                             focus:outline-none focus:ring-2 focus:ring-white/30 
                             focus:border-white/40 transition-all duration-300
                             font-inter text-sm
                             shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white/70"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/40 text-white px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Success message */}
              {successMessage && (
                <div className="bg-green-500/20 border border-green-500/40 text-white px-4 py-3 rounded-xl text-sm">
                  {successMessage}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!email.trim() || !password.trim() || isLoading}
                className="w-full py-3 bg-gradient-to-br from-blue-500/80 via-blue-600/80 to-purple-600/80
                           hover:from-blue-500/90 hover:via-blue-600/90 hover:to-purple-600/90
                           text-white rounded-xl transition-all duration-300
                           border border-white/20 hover:border-white/30
                           font-inter font-medium text-sm backdrop-blur-md
                           shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]
                           hover:shadow-[0_6px_20px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-[1.02] active:scale-[0.98]
                           flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white 
                                    rounded-full animate-spin"></div>
                    <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>

              {/* Mode toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleModeToggle}
                  className="text-white/70 hover:text-white text-sm font-inter transition-colors duration-200"
                >
                  {mode === 'login' 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </button>
              </div>
            </form>

            {/* Ultra subtle decorative elements */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-white/10 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white/8 rounded-full blur-sm animate-pulse" 
                 style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/4 -right-2 w-2 h-2 bg-white/12 rounded-full blur-sm animate-pulse"
                 style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/4 -left-2 w-3 h-3 bg-white/10 rounded-full blur-sm animate-pulse"
                 style={{animationDelay: '0.5s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
}; 