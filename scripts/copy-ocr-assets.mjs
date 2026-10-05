// Copies the receipt-scanner (tesseract.js) runtime + Indonesian/English
// language data into public/ocr so OCR works offline and inside the iOS
// app without depending on a CDN. Runs automatically before dev/build.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const out = new URL("../public/ocr/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const copy = (from, to) => {
  if (!existsSync(from)) throw new Error(`missing OCR asset: ${from}`);
  cpSync(from, join(out, to));
};

copy(join(pkgDir("tesseract.js"), "dist/worker.min.js"), "worker.min.js");
for (const f of [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
]) {
  copy(join(pkgDir("tesseract.js-core"), f), f);
}
copy(join(pkgDir("@tesseract.js-data/ind"), "4.0.0_best_int/ind.traineddata.gz"), "ind.traineddata.gz");
copy(join(pkgDir("@tesseract.js-data/eng"), "4.0.0_best_int/eng.traineddata.gz"), "eng.traineddata.gz");
console.log("OCR assets ready in public/ocr");
