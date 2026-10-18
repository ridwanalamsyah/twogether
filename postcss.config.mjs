/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    // Text follows the iPhone text-size setting (see the plugin's comment).
    "./scripts/postcss-font-rem.cjs": {},
  },
};

export default config;
