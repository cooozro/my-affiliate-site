#!/usr/bin/env node
/**
 * Blog automation runner
 *
 * Tasks:
 *   write          — generate 1 draft (respects 2/day KST cap)
 *   publish        — publish 1 draft (6h gap, 2/day KST cap)
 *   buffer         — ensure 2 drafts in queue
 *   write-morning  — scheduled morning write + buffer top-up
 *   write-evening  — scheduled evening write + buffer top-up
 *   publish-slot   — scheduled publish + buffer top-up
 *   status         — print queue state
 */

import { generateOneDraft, maintainDraftBuffer } from "./generate-draft.mjs";
import { publishOneDraft } from "./publish-draft.mjs";
import { countDrafts, listDrafts } from "./posts-fs.mjs";
import { loadState, saveState } from "./state.mjs";

const task = process.argv[2] ?? "status";

async function main() {
  switch (task) {
    case "write":
      await generateOneDraft();
      break;

    case "publish":
      await publishOneDraft();
      break;

    case "buffer":
      await maintainDraftBuffer();
      break;

    case "write-morning":
    case "write-evening":
      await generateOneDraft();
      await maintainDraftBuffer();
      break;

    case "publish-slot":
      await publishOneDraft();
      break;

    case "status": {
      const state = loadState();
      const drafts = listDrafts();
      console.log(JSON.stringify({
        task,
        draftCount: countDrafts(),
        drafts: drafts.map((d) => ({ slug: d.slug, createdAt: d.createdAt })),
        writeCountToday: state.writeCountToday,
        publishCountToday: state.publishCountToday,
        lastPublishAt: state.lastPublishAt,
      }, null, 2));
      break;
    }

    default:
      console.error(`Unknown task: ${task}`);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
