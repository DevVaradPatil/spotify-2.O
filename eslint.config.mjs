import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next 16 ships native flat config, so it is spread directly
// rather than wrapped in FlatCompat. It already registers the jsx-a11y
// plugin, so only the recommended *rules* are layered on — re-declaring the
// plugin itself is a hard error in flat config.
const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/no-onchange": "off",
    },
  },
];

export default config;
