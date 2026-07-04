#!/usr/bin/env node
/**
 * Wait until draft buffer has >= 1 draft, then queue benchmark (B-type) replenish.
 * Usage: node scripts/automation/wait-and-queue-benchmark.mjs
 */

import { countDrafts, listDrafts } from "./posts-fs.mjs";
import { readCursorDraftRequest, queueBenchmarkReplenish } from "./cursor-draft-request.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";

const POLL_MS = 30_000;
const MAX_WAIT_MS = 45 * 60_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const started = Date.now();
  console.log("Waiting for first in-flight draft to land (buffer >= 1)...");

  while (Date.now() - started < MAX_WAIT_MS) {
    const drafts = listDrafts();
    const request = readCursorDraftRequest();

    if (drafts.length >= 1) {
      console.log(`Buffer ${drafts.length}/${TARGET_DRAFT_COUNT}: ${drafts.map((d) => d.slug).join(", ")}`);
      if (drafts.length >= TARGET_DRAFT_COUNT) {
        console.log("Buffer already full — skip benchmark queue.");
        return;
      }

      const queued = await queueBenchmarkReplenish(request?.publishedSlug ?? null);
      if (!queued) {
        console.error("Failed to queue benchmark replenish.");
        process.exit(1);
      }

      console.log("Benchmark request written to cursor-draft-request.json");
      console.log("Push this file to GitHub to trigger Actions replenish.");
      return;
    }

    const status = request?.status ?? "none";
    console.log(
      `[${new Date().toISOString()}] drafts=0, request=${status}, topic=${request?.topic?.id ?? "n/a"}`,
    );
    await sleep(POLL_MS);
  }

  console.error("Timed out waiting for first draft.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
