#!/usr/bin/env node
/**
 * Smoke test: pipeline Guardian + automation entry points after refactor.
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const ok = result.status === 0;
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) {
    if (result.stdout?.trim()) console.log(result.stdout.trim());
    if (result.stderr?.trim()) console.error(result.stderr.trim());
  }
  return ok;
}

const steps = [
  ["guardian:check-boundary", "npm", ["run", "guardian:check-boundary"]],
  ["content:integrity (drafts)", "npm", ["run", "content:integrity"]],
  ["automation:status", "npm", ["run", "automation:status"]],
];

let failed = 0;
for (const [label, cmd, args] of steps) {
  if (!run(label, cmd, args)) failed += 1;
}

// Direct API import smoke
try {
  const {
    runPublishIntegrityGate,
    auditContentPolicyText,
    METHODOLOGY_BLOCK_EN,
    isPublishedSlug,
  } = await import("./lib/guardian/index.mjs");

  if (typeof runPublishIntegrityGate !== "function") throw new Error("runPublishIntegrityGate missing");
  if (typeof auditContentPolicyText !== "function") throw new Error("auditContentPolicyText missing");
  if (!METHODOLOGY_BLOCK_EN.includes("Analysis methodology")) {
    throw new Error("METHODOLOGY_BLOCK_EN corrupted");
  }
  if (typeof isPublishedSlug !== "function") throw new Error("isPublishedSlug missing");

  const gate = runPublishIntegrityGate(ROOT, "welcome", {
    phase: "draft",
    applyRepair: false,
  });
  if (!gate.ok && !gate.exempt) {
    throw new Error(`welcome draft gate unexpected: ${gate.errors.map((e) => e.message).join("; ")}`);
  }

  console.log("✅ guardian/index.mjs API smoke");
} catch (error) {
  failed += 1;
  console.error(`❌ guardian/index.mjs API smoke`);
  console.error(error instanceof Error ? error.message : String(error));
}

if (failed > 0) {
  console.error(`\n${failed} smoke test(s) failed`);
  process.exit(1);
}

console.log("\nAll pipeline Guardian smoke tests passed");
