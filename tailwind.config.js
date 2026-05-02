/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#D4AF37",
          "gold-light": "#F0D060",
          navy: "#0a1628",
          "navy-light": "#0f2040",
          dark: "#0a0a0a",
        },
      },
    },
  },
  plugins: [],
}
