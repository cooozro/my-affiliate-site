#!/usr/bin/env node
/**
 * One-shot model-deep-dive draft (ops / verification).
 * Usage: node scripts/automation/write-model-deep-dive-once.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadState, saveState, resetDailyCounters } from "./state.mjs";
import { pickTopic } from "./topics.mjs";
import { generateDraftFromRequest } from "./generate-draft.mjs";
import { countDrafts } from "./posts-fs.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot =
  process.env.AIPICK_SITE_ROOT?.trim() ||
  path.resolve(scriptDir, "../..");
process.chdir(siteRoot);

const ROOT = process.cwd();
const requestPath = path.join(ROOT, "data/automation/cursor-draft-request.json");

function cancelStaleCursorRequest() {
  if (!fs.existsSync(requestPath)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(requestPath, "utf8"));
    if (raw.status === "pending" || raw.status === "queued") {
      raw.status = "cancelled";
      raw.cancelledAt = new Date().toISOString();
      raw.cancelReason = "superseded by local model-deep-dive write";
      fs.writeFileSync(requestPath, `${JSON.stringify(raw, null, 2)}\n`);
      console.log("Cancelled stale cursor-draft-request");
    }
  } catch (err) {
    console.warn("cursor-draft-request skip:", err.message);
  }
}

const state = loadState();
resetDailyCounters(state);
state.writeCountToday = 0;
state.formatDeck = [
  "model-deep-dive",
  ...(state.formatDeck ?? []).filter((p) => p !== "model-deep-dive"),
];
saveState(state);
cancelStaleCursorRequest();

console.log("Publishable drafts before:", countDrafts());

const topic = pickTopic(state, { contentProfile: "model-deep-dive" });
console.log(`Picked topic: ${topic.id} (model-deep-dive)`);

const slug = await generateDraftFromRequest(
  { topic, contentProfile: "model-deep-dive" },
  { bypassWriteCap: true },
);

if (!slug) {
  console.error("Write returned null — check daily cap or LLM keys");
  process.exit(1);
}

console.log(`Draft created: ${slug}`);
console.log("Publishable drafts after:", countDrafts());
