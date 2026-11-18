/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#000033', 800: '#001b44', 700: '#0a192f', 600: '#16305a' },
        go: { 500: '#16a34a', 600: '#15803d', 100: '#dcfce7' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
