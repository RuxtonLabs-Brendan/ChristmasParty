/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'christmas-red': '#7f1d1d',
        'christmas-green': '#14532d',
        'christmas-gold': '#fef08a',
      },
      fontFamily: {
        'impact': ['Impact', 'Arial Black', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

