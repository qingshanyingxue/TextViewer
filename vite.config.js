import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap:false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vue:      ['vue'],
          markdown: ['markdown-it', 'markdown-it-anchor'],
          hljs:     ['highlight.js'],
        },
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        entryFileNames:  'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
  },
})
