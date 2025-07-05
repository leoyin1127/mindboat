import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, AlertCircle, Database, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useUserStore } from '../../stores/userStore';

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const {
    signIn,
    signUp,
    enterDemoMode,
    isLoading,
    error,
    clearError
  } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Basic validation
    if (!email.trim() || !password.trim()) {
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }

      // Only call onSuccess if no error occurred
      if (!error) {
        onSuccess();
      }
    } catch (error) {
      // Error is handled by the store
      console.error('Auth error:', error);
    }
  };

  const handleDemoMode = () => {
    clearError();
    enterDemoMode();
    onSuccess();
  };

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-purple-900/10 backdrop-blur-lg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="mx-auto w-16 h-16 mb-4"
          >
            <Anchor className="w-16 h-16 text-blue-300" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">MindBoat</h1>
          <p className="text-blue-200">Begin your focused sailing journey</p>
        </div>

        {/* Database Status Info */}
        {!isSupabaseConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Demo Mode Available
                  </p>
                  <p className="text-xs text-yellow-700">
                    Database not configured. You can try the app in demo mode.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
        >
          {isSupabaseConfigured ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  clearError();
                }}
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  clearError();
                }}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-500/20 border border-red-500/50 rounded-lg p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-300 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-200 text-sm">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <Button
                  type="submit"
                  loading={isLoading}
                  className="w-full"
                  size="lg"
                  disabled={!email.trim() || !password.trim()}
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>

                <Button
                  type="button"
                  onClick={handleDemoMode}
                  variant="outline"
                  className="w-full text-white border-white hover:bg-white/10"
                  size="lg"
                  icon={Play}
                >
                  Try Demo Mode
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <Database className="w-16 h-16 text-blue-300 mx-auto" />
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Database Not Connected
                  </h3>
                  <p className="text-blue-200 text-sm mb-4">
                    Supabase environment variables are not configured. You can still experience the app in demo mode.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleDemoMode}
                  className="w-full"
                  size="lg"
                  icon={Play}
                >
                  Start Demo Mode
                </Button>

                <Button
                  onClick={() => window.open('https://supabase.com', '_blank')}
                  variant="outline"
                  className="w-full text-white border-white hover:bg-white/10"
                  size="lg"
                  icon={Database}
                >
                  Setup Database
                </Button>
              </div>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  clearError();
                }}
                className="text-blue-300 hover:text-blue-200 transition-colors"
                disabled={isLoading}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-blue-300">
              {isSupabaseConfigured
                ? 'Your data will be securely stored and synced across devices'
                : 'Demo mode: Experience the app without creating an account'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};