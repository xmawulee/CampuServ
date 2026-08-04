import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Brand Primary Color Mappings
        primary: {
          DEFAULT: "#FF6B35",
          dark: "#D9531E",
          light: "#FFF5F0",
        },

        // Overrides for Indigo & Blue (mapped to Coral Orange accent scale)
        indigo: {
          50: "#FFF5F0",
          100: "#FFB59A",
          200: "#FF9873",
          300: "#FF8254",
          400: "#FF6B35",
          500: "#FF6B35",
          600: "#FF6B35",
          700: "#E05A2B",
          800: "#D9531E",
          900: "#B84014",
        },
        blue: {
          50: "#FFF5F0",
          100: "#FFB59A",
          200: "#FF9873",
          300: "#FF8254",
          400: "#FF6B35",
          500: "#FF6B35",
          600: "#FF6B35",
          700: "#E05A2B",
          800: "#D9531E",
          900: "#B84014",
        },

        // Overrides for Slate & Gray (mapped to Warm Charcoal & Off-White scales)
        slate: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
        },
        gray: {
          50: "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
        },

        // Direct Custom Brand Tokens
        "accent-default": "#FF6B35",
        "accent-hover": "#E05A2B",
        "accent-pressed": "#D9531E",
        "accent-disabled": "#FFB59A",
        "accent-subtle": "#FFF5F0",
        "text-heading": "#18181B",
        "text-body": "#52525B",
        "text-secondary": "#71717A",
        "text-placeholder": "#A1A1AA",
        "surface-darkBase": "#121215",
        "surface-darkCard": "#1C1C21",
        "surface-lightBase": "#FAFAFA",
        "surface-lightCard": "#FFFFFF",
        "border-light": "#E4E4E7",
        "border-lightStrong": "#D4D4D8",
      },
    },
  },
  plugins: [],
};
export default config;
