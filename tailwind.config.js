/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        terminal: {
          bg: '#f8fafc', // slate-50
          panel: '#ffffff',
          panelMuted: '#f1f5f9', // slate-100
          panelHeader: '#f8fafc',
          border: '#e2e8f0', // slate-200
          borderDark: '#cbd5e1', // slate-300
          text: '#0f172a', // slate-900
          muted: '#64748b', // slate-500
          dim: '#94a3b8', // slate-400
          hover: '#f1f5f9',
          active: '#e2e8f0',
        },
        market: {
          up: '#15803d', // green-700
          upBg: '#ecfdf5', // emerald-50
          upBorder: '#a7f3d0',
          down: '#b91c1c', // red-700
          downBg: '#fef2f2', // red-50
          downBorder: '#fecaca',
          warning: '#b45309', // amber-700
          warningBg: '#fffbeb',
          warningBorder: '#fde68a',
          live: '#16a34a',
        },
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
      },
      fontSize: {
        '2xs': '10px',
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '22px',
      },
      keyframes: {
        'flash-up': {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.28)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-down': {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.28)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'flash-up': 'flash-up 450ms ease-out',
        'flash-down': 'flash-down 450ms ease-out',
      },
    },
  },
  plugins: [],
};
