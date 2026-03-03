import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './node_modules/element-plus/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00BE78',
          light: '#8BE294',
          dark: '#00A868',
          soft: 'rgba(0, 190, 120, 0.12)',
          50: 'rgba(0, 190, 120, 0.08)',
          100: 'rgba(0, 190, 120, 0.16)',
        },
        primary: {
          DEFAULT: '#2D3748',
          soft: '#4A5568',
          light: '#718096',
        },
        success: '#00BE78',
        warning: '#F6AD55',
        error: '#E53E3E',
        info: '#3182CE',
      },
      fontFamily: {
        sans: ['Gellix', 'Udun Text', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        brand: ['Udun Text', 'Gellix', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'base': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    typography,
  ],
}
