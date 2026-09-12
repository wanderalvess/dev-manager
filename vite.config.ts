import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            minify: false,
            rollupOptions: {
              // Dependências nativas e drivers de banco — devem ficar como
              // require() em tempo de execução, nunca inlineadas pelo bundler.
              external: [
                'oracledb',
                'pg',
                'mysql2',
                'fastembed',
                'onnxruntime-node',
                /^@anush008\/tokenizers/,
                /\.node$/
              ]
            },
            rolldownOptions: {
              external: [
                'oracledb',
                'pg',
                'mysql2',
                'fastembed',
                'onnxruntime-node',
                /^@anush008\/tokenizers/,
                /\.node$/
              ]
            }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            minify: false,
            lib: {
              formats: ['cjs'],
              fileName: () => 'index.cjs'
            },
            rolldownOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
                exports: 'none',
                codeSplitting: false
              }
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
});
