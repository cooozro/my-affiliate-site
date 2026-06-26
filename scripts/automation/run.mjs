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
import {
  formatKst,
  MAX_PUBLISH_PER_DAY,
  TARGET_DRAFT_COUNT,
} from "../lib/publish-schedule.mjs";
import { loadState, saveState } from "./state.mjs";

const task = (process.argv[2] ?? "status").trim() || "status";
const publishOnly = process.env.AUTOMATION_MODE === "publish-only";

async function main() {
  switch (task) {
    case "write":
      if (publishOnly) {
        console.log("Publish-only mode: draft writing is done in Cursor. Skipping.");
        break;
      }
      await generateOneDraft();
      break;

    case "publish":
      await publishOneDraft({ force: true });
      break;

    case "buffer":
      if (publishOnly) {
        console.log(
          `Publish-only mode: draft buffer is ${countDrafts()}/2. Add drafts via Cursor.`,
        );
        break;
      }
      await maintainDraftBuffer();
      break;

    case "write-morning":
    case "write-evening":
      if (publishOnly) {
        console.log("Publish-only mode: scheduled write skipped.");
        break;
      }
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
        mode: publishOnly ? "publish-only" : "full",
        draftCount: countDrafts(),
        targetDraftCount: TARGET_DRAFT_COUNT,
        drafts: drafts.map((d) => ({ slug: d.slug, createdAt: d.createdAt })),
        writeCountToday: state.writeCountToday,
        publishCountToday: state.publishCountToday,
        maxPublishPerDay: MAX_PUBLISH_PER_DAY,
        lastPublishAt: state.lastPublishAt,
        nextPublishAt: state.nextPublishAt,
        nextPublishAtKst: state.nextPublishAt ? formatKst(state.nextPublishAt) : null,
        scheduledGapHours: state.scheduledGapHours,
        replenishNote: publishOnly
          ? "Publish 후 OPENAI_API_KEY가 있으면 draft 자동 보충."
          : null,
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
