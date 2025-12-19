/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
        extend: {
      colors: {
        primary: {
          50: '#e8f1ff',
          100: '#d4e1ff',
          200: '#a8c3ff',
          300: '#7aa4ff',
          400: '#4c85f7',
          500: '#1f62d4',  // 메인 색상
          600: '#1a54b5',
          700: '#164593',
          800: '#113675',
          900: '#0c295b',
        },
      },
    },
  },
  plugins: [],
}
