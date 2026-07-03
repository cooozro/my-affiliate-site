#!/usr/bin/env node
/**
 * CI guard: pipeline Guardian modules must not be imported directly.
 * Allowed: scripts/lib/guardian/index.mjs or deprecated shims at scripts/lib/*.mjs
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const INTERNAL_GUARDIAN_IMPORT =
  /from\s+["'](?:\.\.?\/)+(?:guardian\/(?:editorial-standards|content-policy|publish-integrity|automation-guard)\.mjs)["']/g;

const ALLOWED_SHIMS = new Set([
  "scripts/lib/editorial-standards.mjs",
  "scripts/lib/content-policy.mjs",
  "scripts/lib/publish-integrity.mjs",
  "scripts/lib/automation-guard.mjs",
]);

const SHIM_RE = /^\s*\/\*\*?\s*@deprecated[\s\S]*?\*\/\s*export\s+\*\s+from\s+["']\.\/guardian\//;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(mjs|cjs|js|ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

const violations = [];

for (const file of walk(ROOT)) {
  const r = rel(file);
  if (r.startsWith("scripts/lib/guardian/")) continue;

  const text = fs.readFileSync(file, "utf8");

  if (ALLOWED_SHIMS.has(r)) {
    if (!SHIM_RE.test(text)) {
      violations.push(`${r}: shim must only re-export from ./guardian/*`);
    }
    continue;
  }

  INTERNAL_GUARDIAN_IMPORT.lastIndex = 0;
  if (INTERNAL_GUARDIAN_IMPORT.test(text)) {
    violations.push(`${r}: direct guardian internal import — use scripts/lib/guardian/index.mjs`);
  }
}

if (violations.length > 0) {
  console.error("Guardian boundary check failed:\n");
  for (const v of violations) console.error(`  · ${v}`);
  process.exit(1);
}

console.log("Guardian boundary check OK");
