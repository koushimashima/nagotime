/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 大きなサードパーティライブラリを独立したチャンクに分割し、
        // ブラウザキャッシュを効かせやすくする
        manualChunks: {
          // React ランタイムは変更頻度が低いので独立チャンクに
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Leaflet は地図ページ専用だが bundle には含まれるため分離しておく
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          // アイコンライブラリも独立させる
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    passWithNoTests: true,
  },
})
