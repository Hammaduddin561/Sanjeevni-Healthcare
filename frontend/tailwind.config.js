/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans"', 'sans-serif'],
                display: ['"Figtree"', 'sans-serif'],
            },
            colors: {
                clinical: {
                    bg: '#f8fafc', // Slate-50
                    'bg-dark': '#0f172a', // Slate-900
                    primary: '#0f172a',
                    teal: '#0d9488', // Teal-600
                    'teal-dark': '#115e59', // Teal-800
                    'teal-light': '#ccfbf1', // Teal-100
                    cyan: '#22d3ee', // Cyan-400
                    coral: '#f43f5e', // Rose-500
                    surface: '#ffffff',
                    'surface-dark': '#1e293b', // Slate-800
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
                'neon': '0 0 10px rgba(13, 148, 136, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [
        typography,
    ],
}
