/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e1a',
        surface: '#12162a',
        surface2: '#181d35',
        border: '#262c4a',
        text: '#eef0f8',
        textSec: '#9aa1c2',
        textMuted: '#6b7299',
        accentTeal: '#22d3ee',
        accentPurple: '#7c3aed',
        accentMagenta: '#c026d3',
        successBg: '#0f2e22',
        successText: '#4ade80',
        warningBg: '#332108',
        warningText: '#fbbf24',
        infoBg: '#0f1f33',
        infoText: '#60a5fa',
        dangerBg: '#331414',
        dangerText: '#f87171'
      }
    }
  },
  plugins: []
};
