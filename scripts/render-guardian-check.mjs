#!/usr/bin/env node
/**
 * CI guard: render Guardian modules must not be imported directly.
 * Allowed: @/lib/guardian (index) or deprecated shims.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DIRECT_INTERNAL_IMPORT =
  /from\s+["']@\/lib\/guardian\/(meta|json-ld|article-chrome|publication-copy|types)["']/g;

const DIRECT_JSON_LD_IMPORT =
  /from\s+["']@\/lib\/seo\/json-ld\/(?:compose|builders\/)/g;

const ALLOWED_SHIMS = new Set([
  "lib/publication-copy.ts",
  "lib/split-article-content.ts",
]);

const SHIM_RE =
  /^\s*\/\*\*\s*@deprecated[\s\S]*?\*\/\s*export[\s\S]*from\s+["']@\/lib\/guardian\//;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "out"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|mjs|cjs|js)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

const violations = [];

for (const file of walk(ROOT)) {
  const r = rel(file);
  if (r.startsWith("lib/guardian/") || r.startsWith("lib/seo/json-ld/")) continue;

  const text = fs.readFileSync(file, "utf8");

  if (ALLOWED_SHIMS.has(r)) {
    if (!SHIM_RE.test(text)) {
      violations.push(`${r}: shim must only re-export from @/lib/guardian/*`);
    }
    continue;
  }

  DIRECT_INTERNAL_IMPORT.lastIndex = 0;
  if (DIRECT_INTERNAL_IMPORT.test(text)) {
    violations.push(`${r}: direct render guardian internal import — use @/lib/guardian`);
  }

  DIRECT_JSON_LD_IMPORT.lastIndex = 0;
  if (DIRECT_JSON_LD_IMPORT.test(text)) {
    violations.push(`${r}: direct JSON-LD import — use @/lib/guardian`);
  }
}

if (violations.length > 0) {
  console.error("Render Guardian boundary check failed:\n");
  for (const v of violations) console.error(`  · ${v}`);
  process.exit(1);
}

console.log("Render Guardian boundary check OK");
