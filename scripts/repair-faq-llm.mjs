#!/usr/bin/env node
/**
 * Regenerate templated or missing FAQs with OpenAI (per-post, per-locale).
 * Usage: node scripts/repair-faq-llm.mjs [--slug=...] [--force]
 */

import { repairAllFaqSectionsWithLlm } from "./lib/faq-section.mjs";

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
const force = args.includes("--force");

const summary = await repairAllFaqSectionsWithLlm(process.cwd(), {
  slug: slugArg,
  force,
  includeDrafts: true,
});

console.log(JSON.stringify(summary, null, 2));
if (summary.errors?.length > 0) {
  process.exit(1);
}
