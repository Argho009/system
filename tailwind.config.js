/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          600: '#4f46e5', // indigo-600
        }
      }
    },
  },
  plugins: [],
}
