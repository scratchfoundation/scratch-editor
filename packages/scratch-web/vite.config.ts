import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { configJSEndpoint } from './vite-config-js-plugin';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), configJSEndpoint()],

    // See the "Environment Variables" section in the README before using this
    envPrefix: 'VITE_BUILD_TIME_STATIC_',
    envDir: '../..',
    clearScreen: false,
    server: {
        port: 5000,
        strictPort: true,
    },
});
