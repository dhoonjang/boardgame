import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Crimson Text"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: {
          DEFAULT: '#F5E6C8',
          light: '#FAF0DC',
          dark: '#E8D5B0',
        },
        wood: {
          DEFAULT: '#7A5438',
          dark: '#5C3D2E',
          light: '#A0724E',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E0C878',
          dark: '#A08030',
        },
        ink: {
          DEFAULT: '#2C1810',
          light: '#4A3628',
          faded: '#8B7355',
        },
        holy: {
          DEFAULT: '#4A90D9',
          light: '#6AAFEF',
          glow: '#A8D0F5',
          50: '#f0f7ff',
          100: '#e0f0fe',
          500: '#4A90D9',
          600: '#3A78C0',
          700: '#2A60A0',
        },
        corrupt: {
          DEFAULT: '#8E44AD',
          light: '#A569BD',
          glow: '#D4A5E8',
          50: '#fdf4ff',
          100: '#fae8ff',
          500: '#8E44AD',
          600: '#7A3A98',
          700: '#662D80',
        },
        warrior: {
          DEFAULT: '#C0392B',
          light: '#E74C3C',
          500: '#C0392B',
          600: '#A63020',
        },
        rogue: {
          DEFAULT: '#27AE60',
          light: '#2ECC71',
          500: '#27AE60',
          600: '#1E8C4E',
        },
        mage: {
          DEFAULT: '#2980B9',
          light: '#3498DB',
          500: '#2980B9',
          600: '#2070A0',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'damage-pop': 'damagePop 1s ease-out forwards',
        'dice-roll': 'diceRoll 0.6s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(201, 168, 76, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(201, 168, 76, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        damagePop: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-20px) scale(1.2)', opacity: '1' },
          '100%': { transform: 'translateY(-40px) scale(0.8)', opacity: '0' },
        },
        diceRoll: {
          '0%': { transform: 'rotateX(0) rotateY(0)' },
          '25%': { transform: 'rotateX(90deg) rotateY(90deg)' },
          '50%': { transform: 'rotateX(180deg) rotateY(0)' },
          '75%': { transform: 'rotateX(270deg) rotateY(90deg)' },
          '100%': { transform: 'rotateX(360deg) rotateY(0)' },
        },
      },
      boxShadow: {
        'wood': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)',
        'wood-pressed': 'inset 0 2px 4px rgba(0,0,0,0.3)',
        'panel': '0 4px 12px rgba(44, 24, 16, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        'card': '0 2px 8px rgba(44, 24, 16, 0.2)',
      },
    },
  },
  plugins: [],
}
export default config
