/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00ff88',
        secondary: '#00d4ff',
        danger: '#ff4444',
        warning: '#ffaa00',
        dark: '#0a0a1a',
        'card-bg': 'rgba(255,255,255,0.05)',
      },
      backdropBlur: { glass: '10px' },
      fontFamily: { inter: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
