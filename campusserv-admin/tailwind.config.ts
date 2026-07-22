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
        
        // Overrides for Indigo (mapped to Coral Orange accent scale)
        indigo: {
          50: "#FFEBE3",   // accent.subtle
          100: "#FFA787",  // accent.disabled
          200: "#FFA787",
          300: "#FFA787",
          400: "#FF7846",  // accent.default
          500: "#FF7846",  // accent.default
          600: "#FF7846",  // accent.default
          700: "#EB6E40",  // accent.hover
          800: "#D9663C",  // accent.pressed
          900: "#D9663C",
        },

        // Overrides for Blue (mapped to Coral Orange accent scale)
        blue: {
          50: "#FFEBE3",
          100: "#FFA787",
          200: "#FFA787",
          300: "#FFA787",
          400: "#FF7846",
          500: "#FF7846",
          600: "#FF7846",
          700: "#EB6E40",
          800: "#D9663C",
          900: "#D9663C",
        },

        // Overrides for Slate (mapped to Ironside Gray / White Rock scales)
        slate: {
          50: "#E6E6E6",   // surface.lightBase (White Rock)
          100: "#D8D8D8",  // border.light
          200: "#CACACA",  // border.lightStrong
          300: "#C0BEBC",  // text.placeholder
          400: "#96928E",  // text.secondary
          500: "#736E69",  // text.body (Ironside Gray)
          600: "#736E69",
          700: "#5C5854",  // text.heading
          800: "#45423F",  // surface.darkCard
          900: "#3F3D3A",  // surface.darkBase
        },

        // Overrides for Gray (mapped to Ironside Gray / White Rock scales)
        gray: {
          50: "#E6E6E6",
          100: "#D8D8D8",
          200: "#CACACA",
          300: "#C0BEBC",
          400: "#96928E",
          500: "#736E69",
          600: "#736E69",
          700: "#5C5854",
          800: "#45423F",
          900: "#3F3D3A",
        },

        // Direct Custom Brand Tokens
        "accent-default": "#FF7846",
        "accent-hover": "#EB6E40",
        "accent-pressed": "#D9663C",
        "accent-disabled": "#FFA787",
        "accent-subtle": "#FFEBE3",
        "text-heading": "#5C5854",
        "text-body": "#736E69",
        "text-secondary": "#96928E",
        "text-placeholder": "#C0BEBC",
        "surface-darkBase": "#3F3D3A",
        "surface-darkCard": "#45423F",
        "surface-lightBase": "#E6E6E6",
        "surface-lightCard": "#FFFFFF",
        "border-light": "#D8D8D8",
        "border-lightStrong": "#CACACA",
      },
    },
  },
  plugins: [],
};
export default config;
