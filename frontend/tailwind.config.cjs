/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090817',
        panel: '#17152c',
        cyan: '#50e3ff',
        coral: '#ff7b7b',
        gold: '#ffd166',
        violet: '#9b7bff',
        terracotta: '#d97746',
        claude: {
          bg: '#faf8f5',
          shell: '#f4efe9',
          card: '#f5f0eb',
          panel: '#ede6de',
          border: '#dcd4cb',
          text: '#231f1c',
          muted: '#5c534c',
          subtle: '#8c827a',
          accent: '#d97746',
        },
      },
      boxShadow: {
        glow: '0 0 32px rgba(80, 227, 255, 0.22)',
        violet: '0 0 32px rgba(155, 123, 255, 0.28)',
        gold: '0 0 24px rgba(255, 209, 102, 0.22)',
        terracotta: '0 0 32px rgba(217, 119, 70, 0.25)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        podium: ['Anton', 'Space Grotesk', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
