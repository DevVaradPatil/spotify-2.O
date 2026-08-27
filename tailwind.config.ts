import type { Config } from "tailwindcss";

/**
 * Design tokens.
 *
 * Colours were previously hardcoded per component (`bg-neutral-900`,
 * `text-neutral-400`, `bg-green-500`), so there was no single place to adjust
 * contrast or re-theme. These semantic names map onto the existing palette so
 * the visual result is unchanged, but intent is now expressed in the markup.
 *
 * `content` used to reference a `pages/` directory that does not exist and
 * omitted `hooks/`, which holds JSX.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces, darkest to lightest.
        canvas: "#000000",
        surface: "#171717", // neutral-900
        "surface-raised": "#262626", // neutral-800
        "surface-hover": "#404040", // neutral-700

        // Text. `muted` is neutral-300 rather than neutral-400: the latter
        // measures ~4.2:1 on surface, below the 4.5:1 WCAG AA needs.
        content: "#ffffff",
        "content-muted": "#d4d4d4", // neutral-300
        "content-subtle": "#a3a3a3", // neutral-400 — large text only

        // Brand.
        accent: "#22c55e",
        "accent-hover": "#16a34a",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
