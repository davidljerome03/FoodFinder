/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F3EFE0',
        card: '#FAF8F0',
        orange: {
          500: '#FF5A36',
        },
        green: {
          400: '#CFFF6E',
        },
        navy: {
          900: '#1C2E35',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
