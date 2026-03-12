/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-bg': '#0d1117',
        'terminal-bg-secondary': '#161b22',
        'terminal-border': '#30363d',
        'terminal-text': '#c9d1d9',
        'terminal-text-muted': '#8b949e',
        'terminal-accent': '#58a6ff',
        'terminal-success': '#3fb950',
        'terminal-warning': '#d29922',
        'terminal-error': '#f85149',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        'sans': ['Inter', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
