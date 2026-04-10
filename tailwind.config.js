/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0b0d",
        surface: "#12141a",
        "surface-alt": "#1a1d26",
        border: "#252833",
        "border-focus": "#22d68a",
        "text-primary": "#e8eaed",
        "text-dim": "#8b8fa3",
        "text-muted": "#555a6e",
        accent: "#22d68a",
        "accent-dim": "#1aab6e",
        danger: "#ef4444",
        warning: "#f59e0b",
        blue: "#3b82f6",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Montserrat'", "sans-serif"],
        body: ["'Poppins'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
