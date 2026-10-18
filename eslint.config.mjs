import nextVitals from "eslint-config-next/core-web-vitals";

// Same plugin instance next's config registered (flat config needs it in
// the object that sets its rules).
const reactHooks = nextVitals.find((c) => c.plugins?.["react-hooks"])?.plugins["react-hooks"];

const config = [
  ...nextVitals,
  {
    plugins: { "react-hooks": reactHooks },
    // New with eslint-config-next 16: React Compiler checks. The app doesn't
    // use the compiler and these flag long-standing patterns (setState in an
    // effect, Date.now() during render), so they warn instead of failing CI.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
  { ignores: ["out/**", ".next/**", "ios/**", "public/**", "node_modules/**"] },
];

export default config;
