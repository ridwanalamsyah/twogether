// PostCSS plugin: font sizes in px become rem (16px = 1rem), so all text
// follows the root font size. The app sets that root size from the
// iPhone's text-size setting (see components/theme/TextSize.tsx); everywhere
// else 1rem stays 16px and nothing changes.
const PX = /(-?\d*\.?\d+)px\b/g;

module.exports = () => ({
  postcssPlugin: "font-rem",
  Declaration: {
    "font-size"(decl) {
      if (!decl.value.includes("px")) return;
      decl.value = decl.value.replace(PX, (_, n) => `${+(Number(n) / 16).toFixed(4)}rem`);
    },
  },
});
module.exports.postcss = true;
