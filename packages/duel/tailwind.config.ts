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
        duel: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          accent: '#6366f1',
          gold: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
}
export default config
