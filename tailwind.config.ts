import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#FAF8F5",  // Sehr helles Warm Beige
          100: "#F5F1EA",  // Helles Warm Beige
          200: "#E8E1D5",  // Soft Beige
          300: "#D4C8B8",  // Muted Taupe
          400: "#B8A68E",  // Warm Taupe
          500: "#9C8670",  // Muted Bronze (Primär)
          600: "#7D6B56",  // Dunkles Bronze
          700: "#5F5242",  // Sehr dunkles Bronze
          800: "#3F3830",  // Charcoal Brown
          900: "#2A251F",  // Deep Charcoal
        },
        warm: {
          50:  "#FDF8F2",
          100: "#F5EDE0",
          200: "#E8D9C0",
          300: "#D4C4A8",
          400: "#C9963A",
          500: "#A67A28",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      animation: {
        "page-turn": "pageTurn 0.6s ease-in-out",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        pageTurn: {
          "0%":   { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(-180deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
