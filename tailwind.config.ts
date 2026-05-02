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
          50:  "#FAF5FF",  // Sehr helles Lila
          100: "#F3E8FF",  // Helles Lila
          200: "#E9D5FF",  // Lila-Pastell
          300: "#D8B4FE",  // Mittleres Lila
          400: "#C084FC",  // Lila
          500: "#A855F7",  // Kräftiges Lila
          600: "#9333EA",  // Dunkles Lila
          700: "#7E22CE",  // Sehr dunkles Lila
          800: "#6B21A8",  // Dunkel-Lila
          900: "#581C87",  // Sehr dunkel
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
