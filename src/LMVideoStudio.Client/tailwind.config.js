/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src-js/**/*.js"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f1419",
          raised: "#1a2332",
          border: "#2d3a4f",
        },
        accent: {
          DEFAULT: "#3b82f6",
          muted: "#2563eb",
        },
      },
    },
  },
  plugins: [],
};
