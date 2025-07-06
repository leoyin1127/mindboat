import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/spline-webhook': {
        target: 'https://hooks.spline.design',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/spline-webhook/, ''),
        secure: true,
      },
    },
  },
});