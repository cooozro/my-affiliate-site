import fs from "fs";
import path from "path";
import { countDrafts } from "./posts-fs.mjs";
import { pickTopic } from "./topics.mjs";
import { loadState, saveState } from "./state.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";

const REQUEST_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "cursor-draft-request.json",
);

export function readCursorDraftRequest() {
  if (!fs.existsSync(REQUEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(REQUEST_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Plan A: after publish, queue a Cursor (not OpenAI) draft replenish signal.
 * GitHub Actions commits this file; Cursor agent writes the draft and marks complete.
 */
export function queueCursorDraftReplenish(publishedSlug) {
  const draftCount = countDrafts();
  const needed = TARGET_DRAFT_COUNT - draftCount;

  if (needed <= 0) {
    const existing = readCursorDraftRequest();
    if (existing?.status === "pending") {
      writeRequest({
        status: "complete",
        completedAt: new Date().toISOString(),
        draftCount,
        note: "Buffer full; cleared stale pending request.",
      });
    }
    console.log(`Draft buffer full (${draftCount}/${TARGET_DRAFT_COUNT})`);
    return false;
  }

  const state = loadState();
  const topic = pickTopic(state);
  saveState(state);

  writeRequest({
    status: "pending",
    needed,
    publishedSlug,
    requestedAt: new Date().toISOString(),
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
    },
    instructions:
      "Write one bilingual buying-guide draft (en+ko, draft:true) per docs/CONTENT_STANDARDS.md. " +
      "Suggested slug: 2026-budget-{topic-id}-guide. Run npm run content:validate, then set status to complete.",
  });

  console.log(
    `Cursor draft replenish queued: ${needed} needed, topic=${topic.id} (Plan A — no OpenAI)`,
  );
  return true;
}

export function completeCursorDraftRequest(writtenSlug) {
  writeRequest({
    status: "complete",
    completedAt: new Date().toISOString(),
    writtenSlug,
    draftCount: countDrafts(),
  });
  console.log(`Cursor draft request completed: ${writtenSlug}`);
}

function writeRequest(data) {
  fs.mkdirSync(path.dirname(REQUEST_PATH), { recursive: true });
  fs.writeFileSync(REQUEST_PATH, `${JSON.stringify(data, null, 2)}\n`);
}
