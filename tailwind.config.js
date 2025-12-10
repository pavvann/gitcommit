/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gc-dark': '#0d1117',
        'gc-darker': '#010409',
        'gc-border': '#30363d',
        'gc-accent': '#58a6ff',
        'gc-green': '#3fb950',
        'gc-red': '#f85149',
        'gc-yellow': '#d29922',
        'gc-purple': '#a371f7',
        'gc-text': '#c9d1d9',
        'gc-muted': '#8b949e',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}

