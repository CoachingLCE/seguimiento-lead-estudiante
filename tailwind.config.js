/** @type {import('tailwindcss').Config} */
function conVariable(nombre) {
  return `rgb(var(--color-${nombre}) / <alpha-value>)`;
}

module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: conVariable('bg'),
        surface: conVariable('surface'),
        surface2: conVariable('surface2'),
        border: conVariable('border'),
        text: conVariable('text'),
        textSec: conVariable('textSec'),
        textMuted: conVariable('textMuted'),
        accentTeal: conVariable('accentTeal'),
        accentPurple: conVariable('accentPurple'),
        accentMagenta: conVariable('accentMagenta'),
        successBg: conVariable('successBg'),
        successText: conVariable('successText'),
        warningBg: conVariable('warningBg'),
        warningText: conVariable('warningText'),
        infoBg: conVariable('infoBg'),
        infoText: conVariable('infoText'),
        dangerBg: conVariable('dangerBg'),
        dangerText: conVariable('dangerText')
      }
    }
  },
  plugins: []
};
