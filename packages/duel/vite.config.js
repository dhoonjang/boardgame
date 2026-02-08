import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@duel/core': path.resolve(__dirname, '../duel-core/src/index.ts'),
        },
    },
    optimizeDeps: {
        exclude: ['@duel/core'],
    },
    build: {
        outDir: 'dist',
    },
});
