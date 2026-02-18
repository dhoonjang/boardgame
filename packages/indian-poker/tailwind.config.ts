import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        card: {
          low: '#ef4444',
          mid: '#f59e0b',
          high: '#22c55e',
        },
        poker: {
          bg: '#0c2e1a',
          surface: '#153d27',
          border: '#8B7355',
          accent: '#D4A843',
          gold: '#FFD700',
        },
      },
    },
  },
  plugins: [],
}
export default config
