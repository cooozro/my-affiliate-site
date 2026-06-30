#!/usr/bin/env node
import { listDrafts, listSlugDirs } from "./automation/posts-fs.mjs";
import { runPublishIntegrityGate } from "./lib/publish-integrity.mjs";
import { loadState } from "./automation/state.mjs";

const root = process.cwd();
const phase = process.argv.includes("--draft") ? "draft" : "publish";
const draftsOnly = process.argv.includes("--drafts-only");
const state = phase === "publish" ? loadState() : null;
let failed = 0;

const slugs = draftsOnly
  ? listDrafts().map((d) => d.slug)
  : listSlugDirs();

for (const slug of slugs) {
  const result = runPublishIntegrityGate(root, slug, {
    phase,
    state,
    applyRepair: process.argv.includes("--repair"),
  });
  if (!result.ok) {
    failed += 1;
    console.log(`\n--- ${slug} ---`);
    for (const e of result.errors) console.log(`  ERROR: ${e.message}`);
    for (const w of result.warnings) console.log(`  WARN: ${w.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} post(s) failed integrity [${phase}]`);
  process.exit(1);
}

console.log(`All posts passed integrity gate [${phase}]`);
