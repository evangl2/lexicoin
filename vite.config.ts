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
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // Core React, State, and UI fundamentals
                        if (id.includes('react/') || 
                            id.includes('react-dom/') || 
                            id.includes('scheduler/') || 
                            id.includes('zustand/') ||
                            id.includes('tslib/') ||
                            id.includes('object-assign/') ||
                            id.includes('use-sync-external-store/') ||
                            id.includes('lucide-react/') || 
                            id.includes('@use-gesture/') || 
                            id.includes('@tanstack/react-virtual/')) {
                            return 'vendor-core';
                        }

                        // Transformers & Utils
                        if (id.includes('sucrase/') || id.includes('nanoid/')) {
                            return 'vendor-utils';
                        }

                        // Animation & Motion
                        if (id.includes('motion/') || id.includes('framer-motion/')) {
                            return 'vendor-motion';
                        }
                        
                        // Data persistence and Supabase
                        if (id.includes('@supabase/') || id.includes('dexie/')) {
                            return 'vendor-data';
                        }
                        
                        // Drag and Drop
                        if (id.includes('react-dnd') || id.includes('dnd-core')) {
                            return 'vendor-dnd';
                        }
                        
                        // Let Rollup handle other small dependencies naturally to avoid circular chunks
                    }
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
