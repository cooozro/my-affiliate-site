#!/usr/bin/env node
import { listDrafts, listSlugDirs } from "./automation/posts-fs.mjs";
import { runPublishIntegrityGate } from "./lib/publish-integrity.mjs";
import { loadState } from "./automation/state.mjs";

const root = process.cwd();
const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const positional = argv.filter((a) => !a.startsWith("--"));

const phase = flags.includes("--draft") ? "draft" : "publish";
const draftsOnly = flags.includes("--drafts-only");
const singleSlug = positional[0] ?? null;
const state = phase === "publish" ? loadState() : null;
let failed = 0;

const slugs = singleSlug
  ? [singleSlug]
  : draftsOnly
    ? listDrafts().map((d) => d.slug)
    : listSlugDirs();

for (const slug of slugs) {
  const result = runPublishIntegrityGate(root, slug, {
    phase,
    state,
    applyRepair: flags.includes("--repair"),
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
