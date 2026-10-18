// Lets the plain-Node tests import app modules: maps "@/x" to src/x.ts(x),
// the same alias tsconfig and Next use. Node strips the TypeScript types.
// Usage: node --import ./scripts/ts-alias.mjs scripts/some.test.mjs
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      import { existsSync } from "node:fs";
      const src = ${JSON.stringify(new URL("../src/", import.meta.url).href)};
      export async function resolve(spec, ctx, next) {
        if (spec.startsWith("@/")) {
          const base = new URL(spec.slice(2), src);
          for (const ext of [".ts", ".tsx", "/index.ts"]) {
            const u = new URL(base.href + ext);
            if (existsSync(u)) return next(u.href, ctx);
          }
        }
        return next(spec, ctx);
      }
    `),
);
