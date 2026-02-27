module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#EA580C",
          foreground: "#FFFFFF",
          hover: "#C2410C",
          light: "#FFF7ED"
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
          hover: "#E2E8F0"
        },
        background: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC"
        },
        surface: {
          DEFAULT: "#FFFFFF",
          hover: "#F8FAFC"
        },
        text: {
          main: "#0F172A",
          muted: "#64748B",
          inverted: "#FFFFFF"
        },
        status: {
          success: "#16A34A",
          warning: "#CA8A04",
          error: "#DC2626",
          info: "#2563EB"
        },
        border: {
          DEFAULT: "#E2E8F0",
          focus: "#EA580C"
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Public Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
