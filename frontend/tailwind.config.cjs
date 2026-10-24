/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#090817', panel: '#17152c', cyan: '#50e3ff', coral: '#ff7b7b', gold: '#ffd166', violet: '#9b7bff' },
      boxShadow: { glow: '0 0 32px rgba(80, 227, 255, 0.22)', violet: '0 0 32px rgba(155, 123, 255, 0.28)' },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        podium: ['FSP DEMO - PODIUM Sharp 4.11', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
