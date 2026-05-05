import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import obfuscatorPlugin from 'vite-plugin-obfuscator'

export default defineConfig({
  plugins: [
    vue(),
    // 仅在生产环境启用混淆
    process.env.NODE_ENV === 'production' && obfuscatorPlugin({
      // 混淆配置
      options: {
        compact: true,                    // 压缩代码
        controlFlowFlattening: true,      // 控制流平坦化（增加逆向难度）
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,          // 注入死代码
        deadCodeInjectionThreshold: 0.2,
        debugProtection: true,            // 禁用调试器
        disableConsoleOutput: true,       // 禁用 console
        identifierNamesGenerator: 'mangled-shuffled',  // 变量名混淆
        rotateStringArray: true,          // 字符串数组旋转
        selfDefending: true,              // 自我保护（检测代码美化）
        stringArray: true,                // 字符串数组化
        stringArrayEncoding: ['base64'],  // 字符串编码
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: true,      // Unicode 转义
        transformObjectKeys: true,        // 对象键名转换
      },
    }),
  ].filter(Boolean),
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
    },
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
