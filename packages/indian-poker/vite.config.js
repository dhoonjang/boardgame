import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@indian-poker/server/game': path.resolve(__dirname, '../indian-poker-server/src/game/index.ts'),
        },
    },
    optimizeDeps: {
        exclude: ['@indian-poker/server'],
    },
    build: {
        outDir: 'dist',
    },
});
