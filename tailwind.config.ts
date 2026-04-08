import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f8f9",
          100: "#dcecef",
          500: "#2f7c87",
          700: "#20555d",
          900: "#123137"
        }
      }
    }
  },
  plugins: []
};

export default config;
