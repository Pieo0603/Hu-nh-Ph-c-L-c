/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",          // Quét các file ở root (App.tsx, index.tsx)
    "./components/**/*.{js,ts,jsx,tsx}", // Quét thư mục components
    "./services/**/*.{js,ts,jsx,tsx}",   // Quét thư mục services (nếu có UI logic)
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        heading: ['"Outfit"', 'sans-serif'],
        hand: ['"Patrick Hand"', 'cursive'],
      },
      colors: {
        neon: {
          orange: '#FF8C00',
          gold: '#FFD700',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}