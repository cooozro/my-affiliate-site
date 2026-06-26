import fs from "fs";
import path from "path";
import { scheduleFirstPublishOfDay } from "../lib/publish-schedule.mjs";

const STATE_PATH = path.join(process.cwd(), "data", "automation", "state.json");

const DEFAULT_STATE = {
  topicIndex: 0,
  usedTopicIds: [],
  lastPublishAt: null,
  nextPublishAt: null,
  scheduledGapHours: null,
  publishCountToday: 0,
  publishDateKst: null,
  writeCountToday: 0,
  writeDateKst: null,
  history: [],
};

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { ...DEFAULT_STATE };
  }

  try {
    return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function kstNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
}

export function resetDailyCounters(state) {
  const today = kstDateString();
  if (state.publishDateKst !== today) {
    const previousDay = state.publishDateKst;
    state.publishDateKst = today;
    state.publishCountToday = 0;
    if (previousDay) {
      scheduleFirstPublishOfDay(state);
    }
  }
  if (state.writeDateKst !== today) {
    state.writeDateKst = today;
    state.writeCountToday = 0;
  }
}
