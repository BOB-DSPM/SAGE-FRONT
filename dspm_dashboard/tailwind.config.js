/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
        extend: {
      colors: {
        primary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#0B5629',  // 메인 색상
          600: '#0a4d24',
          700: '#08421f',
          800: '#07381b',
          900: '#052d15',
        },
      },
    },
  },
  plugins: [],
}
