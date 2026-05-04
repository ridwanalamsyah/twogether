import type { Config } from "tailwindcss";

/**
 * Tailwind config wired to design-token CSS variables so the entire UI
 * re-themes by toggling `data-theme` / `data-accent` on the root.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          app: "var(--bg-app)",
          elev1: "var(--bg-elev1)",
          elev2: "var(--bg-elev2)",
          elev3: "var(--bg-elev3)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          1: "var(--text-1)",
          2: "var(--text-2)",
          3: "var(--text-3)",
          4: "var(--text-4)",
          5: "var(--text-5)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          bg: "var(--positive-bg)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          bg: "var(--negative-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
        },
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      fontFamily: {
        sans: ["var(--font)"],
        mono: ["var(--mono)"],
      },
      transitionTimingFunction: {
        ios: "var(--ease-ios)",
      },
    },
  },
  plugins: [],
};

export default config;
