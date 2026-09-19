import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Crisis Command Color Palette
        crisis: {
          safe: "#10b981",       // Neon Emerald
          warning: "#f59e0b",    // Warning Amber
          critical: "#f43f5e",   // Alert Crimson / Neon Rose
          cyan: "#06b6d4",       // Tactical Cyan
          electric: "#3b82f6",   // Water Velocity Blue
          infra: "#a855f7",      // Strategic Purple
          darkbg: "#020617",     // Slate 950 Deep Command
          panel: "#090d1a",      // Command Panel Glass
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))" },
          "50%": { opacity: "0.4", filter: "drop-shadow(0 0 2px rgba(244, 63, 94, 0.2))" },
        },
        "water-flow": {
          "0%": { strokeDashoffset: "20" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "radar-sweep": "radar-sweep 4s linear infinite",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        "water-flow": "water-flow 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
