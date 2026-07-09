import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        accent: {
          DEFAULT: "#0070f3",
          hover: "#0761d1",
          soft: "#e5f1ff",
        },
        ink: "#171717",
        subtle: "#666666",
        // CSS variables, not literals: `bg-line` is used for progress-bar tracks
        // and skeletons, and a hardcoded #eaeaea reads as a *filled* bar in dark
        // mode. No opacity modifiers are used on these, which is the one thing
        // Tailwind can't do with a var().
        line: "var(--line)",
        canvas: "var(--bg-muted)",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04)",
        lift: "0 8px 30px rgba(0,0,0,0.08)",
        bar: "0 1px 0 rgba(0,0,0,0.04)",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shake: "shake 0.35s cubic-bezier(.36,.07,.19,.97)",
        // No fill-mode: an element that never runs these is left at its resting
        // state, which is visible. Never hide page content behind an inline
        // `opacity: 0` that only JS can undo.
        "fade-in": "fade-in 0.28s cubic-bezier(.16,1,.3,1)",
        // `backwards` holds the from-state through the stagger delay only.
        "fade-up": "fade-up 0.35s cubic-bezier(.16,1,.3,1) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
