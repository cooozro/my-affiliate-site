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
import { readCursorDraftRequest } from "./cursor-draft-request.mjs";
import { loadState } from "./state.mjs";

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

    case "daily-audit": {
      const { runDailyContentAuditIfDue } = await import(
        "../lib/daily-content-audit-runner.mjs"
      );
      const result = await runDailyContentAuditIfDue();
      if (!result.ran) {
        console.log(`Daily content audit skipped: ${result.reason}`);
      }
      break;
    }

    case "repair-faq-llm": {
      const { repairAllFaqSectionsWithLlm } = await import("../lib/faq-section-repair.mjs");
      const summary = await repairAllFaqSectionsWithLlm(process.cwd(), {
        includeDrafts: true,
        force: process.argv.includes("--force"),
      });
      console.log(JSON.stringify(summary, null, 2));
      if (summary.errors?.length > 0) process.exit(1);
      break;
    }

    case "scan-templated-content": {
      const { scanTemplatedContentIssues } = await import("../lib/faq-section-audit.mjs");
      const report = scanTemplatedContentIssues(process.cwd());
      console.log(JSON.stringify(report, null, 2));
      break;
    }

    case "repair-related-guides": {
      const { repairAllRelatedGuides } = await import("../lib/related-guides.mjs");
      const summary = repairAllRelatedGuides(process.cwd(), {
        includeDrafts: true,
      });
      console.log(
        `Related guides repair: ${summary.scanned} scanned, ${summary.changed} updated`,
      );
      for (const repair of summary.repairs) {
        console.log(`  · ${repair}`);
      }
      break;
    }

    case "refresh-covers": {
      const { spawnSync } = await import("node:child_process");
      const result = spawnSync("node", ["scripts/refresh-duplicate-covers.mjs"], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      if (result.status !== 0) process.exit(result.status ?? 1);
      break;
    }

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
          ? "Publish 후 buffer < 2이면 GHA에서 Cursor SDK로 draft 자동 보충 (CURSOR_API_KEY 필요)."
          : null,
        cursorDraftRequest: readCursorDraftRequest(),
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
