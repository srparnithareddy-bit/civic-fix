/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#172033',
          900: '#0f172a',
          950: '#090d16'
        },
        civic: {
          blue: '#2563eb',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
