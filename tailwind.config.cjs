/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { soft: "0 8px 30px rgba(0,0,0,0.08)" }
    },
  },
  plugins: [],
}
