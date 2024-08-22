import preset from './tailwind-preset.js';

/** @type {import('tailwindcss').Config} */
export default {
    presets: [preset],
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
};
