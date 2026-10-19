// Tiny static server for the exported app in out/ (used by the e2e tests):
// /home → out/home.html, unknown paths → 404.html, like the real hosting.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.env.PORT ?? 3210);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".wasm": "application/wasm",
};

async function tryRead(p) {
  try {
    return await readFile(p);
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidates = path.endsWith("/") ? [join(ROOT, path, "index.html")] : [join(ROOT, path), join(ROOT, path + ".html")];
  for (const file of candidates) {
    const body = await tryRead(file);
    if (body) {
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      return res.end(body);
    }
  }
  res.writeHead(404, { "Content-Type": TYPES[".html"] });
  res.end(await tryRead(join(ROOT, "404.html")));
}).listen(PORT, () => console.log(`out/ on http://localhost:${PORT}`));
