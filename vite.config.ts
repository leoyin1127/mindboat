import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@3d': path.resolve(__dirname, 'src/components/3d'),
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate 3D/Spline code into its own chunk
          spline: ['@splinetool/react-spline'],
          // Separate voice/AI services
          voice: ['tone'],
          // Vendor libraries
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          // State management
          stores: ['zustand'],
          // UI components
          ui: ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit for 3D chunks
    target: 'esnext',
    minify: 'esbuild' // Use esbuild for faster builds
  },
  server: {
    // Enable HTTPS unconditionally during local development so that
    // Spline's event-stream endpoint permits CORS. vite-plugin-mkcert
    // auto-generates a valid self-signed certificate the first time you run `npm run dev`.
    // @ts-expect-error  boolean is accepted by Vite but the type definition wants ServerOptions too
    https: true,
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
