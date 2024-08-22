import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    envPrefix: 'SCRATCH_WEB_',
    envDir: '../../',
    clearScreen: false,
    server: {
        port: 5000,
        strictPort: true,
    },
});
