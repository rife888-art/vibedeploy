import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        border: '#222222',
        'border-subtle': '#1a1a1a',
        foreground: '#ffffff',
        'foreground-muted': '#888888',
        'foreground-subtle': '#555555',
        accent: '#0d9488',
        'accent-hover': '#0f766e',
        'accent-muted': 'rgba(13,148,136,0.1)',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 40' width='200' height='40' fill='none'%3e%3cpath d='M0 30 Q25 10 50 30 T100 30 T150 30 T200 30' stroke='rgba(13,148,136,0.06)' stroke-width='1.5' fill='none'/%3e%3cpath d='M0 20 Q25 0 50 20 T100 20 T150 20 T200 20' stroke='rgba(13,148,136,0.04)' stroke-width='1' fill='none'/%3e%3c/svg%3e")`,
      },
    },
  },
  plugins: [],
}

export default config
