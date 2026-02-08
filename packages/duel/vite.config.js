import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@duel/server/game': path.resolve(__dirname, '../duel-server/src/game/index.ts'),
        },
    },
    optimizeDeps: {
        exclude: ['@duel/server'],
    },
    build: {
        outDir: 'dist',
    },
});
