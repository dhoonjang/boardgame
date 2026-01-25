import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 소스 파일 직접 참조 (HMR 지원)
      '@forgod/core': path.resolve(__dirname, '../forgod-core/src/index.ts'),
    },
  },
  optimizeDeps: {
    // 소스에서 직접 가져오므로 prebundle 제외
    exclude: ['@forgod/core'],
  },
  build: {
    outDir: 'dist',
  },
})
