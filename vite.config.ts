import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@core': path.resolve(__dirname, './src/core'),
            '@modules': path.resolve(__dirname, './src/modules'),
            '@ui': path.resolve(__dirname, './src/ui'),
            '@types': path.resolve(__dirname, './src/types'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@store': path.resolve(__dirname, './src/core/store'),
            '@schemas': path.resolve(__dirname, './src/schemas'),
        },
    },
    server: {
        port: 5173,
        host: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react':    ['react', 'react-dom'],
                    'vendor-motion':   ['motion'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                    'vendor-dexie':    ['dexie'],
                    'vendor-dnd':      ['react-dnd', 'react-dnd-html5-backend'],
                    'vendor-sucrase':  ['sucrase'],
                },
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.match(/\.(woff2?|ttf|otf)$/)) {
                        return 'assets/fonts/[name][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
    },
});
