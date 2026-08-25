/**
 * Scheduler pause flag — Selahim isActive=false or manual ops.
 * When paused, publish-slot / draft replenish must no-op.
 */

import fs from "fs";
import path from "path";

import { loadState, saveState } from "../automation/state.mjs";

const REQUEST_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "cursor-draft-request.json",
);

export function isSchedulerPaused(state) {
  if (process.env.AIPICK_SCHEDULER_PAUSED === "true") return true;
  return state?.schedulerPaused === true;
}

export function setSchedulerPaused(root, paused, reason) {
  process.chdir(root);
  const state = loadState();
  state.schedulerPaused = Boolean(paused);
  if (paused) {
    state.schedulerPausedAt = new Date().toISOString();
    state.schedulerPausedReason =
      reason?.trim() || "Scheduler paused (Selahim or manual)";
  } else {
    delete state.schedulerPausedAt;
    delete state.schedulerPausedReason;
  }
  saveState(state);

  if (paused && fs.existsSync(REQUEST_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(REQUEST_PATH, "utf8"));
      if (raw?.status === "pending") {
        raw.status = "cancelled";
        raw.cancelledAt = new Date().toISOString();
        raw.cancelReason = state.schedulerPausedReason;
        fs.writeFileSync(REQUEST_PATH, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      }
    } catch {
      /* ignore */
    }
  }

  return state;
}
