import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        brand: {
          bg: "#0B0F14",
          surface: "#111827",
          elevated: "#1F2937",
          neon: "#22FF88",
          cyan: "#22D3EE",
          text: "#E5E7EB",
          muted: "#9CA3AF",
          border: "rgba(156, 163, 175, 0.18)",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        sans: ["var(--font-manrope)"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 255, 136, 0.22), 0 18px 48px rgba(34, 255, 136, 0.18)",
        cyan: "0 18px 48px rgba(34, 211, 238, 0.16)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top left, rgba(34, 255, 136, 0.18), transparent 35%), radial-gradient(circle at top right, rgba(34, 211, 238, 0.18), transparent 30%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(34, 255, 136, 0.18), 0 18px 40px rgba(34, 255, 136, 0.12)" },
          "50%": { boxShadow: "0 0 0 1px rgba(34, 255, 136, 0.28), 0 22px 60px rgba(34, 255, 136, 0.22)" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3.6s ease-in-out infinite",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
