var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: true, // Allow external connections
        hmr: {
            overlay: true, // Show error overlay
        },
        // Faster HMR in development
        watch: {
            usePolling: false,
            interval: 100,
        },
    },
    build: __assign({ 
        // Optimize for development builds
        minify: process.env.NODE_ENV === 'production', sourcemap: true, rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-scroll-area'],
                },
            },
        } }, (process.env.NODE_ENV === 'development' && {
        minify: false,
        terserOptions: undefined,
    })),
    optimizeDeps: {
        // Pre-bundle these for faster dev server startup
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
        ],
        // Exclude these from pre-bundling (they're large)
        exclude: ['@tanstack/react-virtual'],
    },
    // Development-specific optimizations
    esbuild: __assign({}, (process.env.NODE_ENV === 'development' && {
        minifyIdentifiers: false,
        minifySyntax: false,
        minifyWhitespace: false,
    })),
});
