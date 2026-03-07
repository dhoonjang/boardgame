import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 소스 파일 직접 참조 (HMR 지원)
      '@forgod/server/game': path.resolve(__dirname, '../forgod-server/src/game/index.ts'),
    },
  },
  optimizeDeps: {
    // 소스에서 직접 가져오므로 prebundle 제외
    exclude: ['@forgod/server'],
  },
  build: {
    outDir: 'dist',
  },
})
