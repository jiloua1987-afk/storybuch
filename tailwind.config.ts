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
          50:  "#FFF7ED",  // Sehr helles Orange
          100: "#FFEDD5",  // Helles Orange
          200: "#FED7AA",  // Orange-Pastell
          300: "#FDBA74",  // Mittleres Orange
          400: "#FB923C",  // Orange
          500: "#F97316",  // Kräftiges Orange
          600: "#EA580C",  // Dunkles Orange
          700: "#C2410C",  // Sehr dunkles Orange
          800: "#9A3412",  // Dunkel-Orange
          900: "#7C2D12",  // Sehr dunkel
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
