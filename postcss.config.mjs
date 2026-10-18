import { fileURLToPath } from "node:url";

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    // Text follows the iPhone text-size setting (see the plugin's comment).
    // Absolute path: Turbopack resolves plugin names from its own build folder.
    [fileURLToPath(new URL("./scripts/postcss-font-rem.cjs", import.meta.url))]: {},
  },
};

export default config;
