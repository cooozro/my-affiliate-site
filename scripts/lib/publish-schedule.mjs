export const MAX_PUBLISH_PER_DAY = 2;
export const TARGET_DRAFT_COUNT = 2;
export const MIN_PUBLISH_GAP_HOURS = 4;
export const MAX_PUBLISH_GAP_HOURS = 6;
/** First publish anchor each KST day (06:00) plus a 4–6h random offset. */
export const KST_DAY_START_HOUR = 6;

function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** KST wall-clock date/time → UTC Date (KST is fixed UTC+9). */
function kstWallClockToUtc(year, month, day, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0));
}

function parseKstDateString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

export function randomPublishGapMs() {
  const min = MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  const max = MAX_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Random 4–6 hours in whole-minute steps from the 06:00 KST anchor. */
export function randomFirstSlotOffsetMs() {
  const minMinutes = MIN_PUBLISH_GAP_HOURS * 60;
  const maxMinutes = MAX_PUBLISH_GAP_HOURS * 60;
  const minutes =
    minMinutes + Math.floor(Math.random() * (maxMinutes - minMinutes + 1));
  return minutes * 60 * 1000;
}

export function kstDayAnchorUtc(dateString, hour = KST_DAY_START_HOUR) {
  const { year, month, day } = parseKstDateString(dateString);
  return kstWallClockToUtc(year, month, day, hour, 0);
}

export function scheduleNextDayFirstPublish(state, from = new Date()) {
  const offsetMs = randomFirstSlotOffsetMs();
  const todayKst = kstDateString(from);
  const { year, month, day } = parseKstDateString(todayKst);
  const tomorrowAnchor = kstWallClockToUtc(year, month, day + 1, KST_DAY_START_HOUR, 0);

  state.scheduledGapHours = Math.round((offsetMs / 3_600_000) * 100) / 100;
  state.nextPublishAt = new Date(tomorrowAnchor.getTime() + offsetMs).toISOString();
}

export function scheduleFirstPublishOfDay(state, from = new Date()) {
  const offsetMs = randomFirstSlotOffsetMs();
  const todayKst = kstDateString(from);
  const anchor = kstDayAnchorUtc(todayKst, KST_DAY_START_HOUR);
  const target = anchor.getTime() + offsetMs;

  state.scheduledGapHours = Math.round((offsetMs / 3_600_000) * 100) / 100;

  if (target <= from.getTime()) {
    // Morning window already passed — publish on the next cron check, not tomorrow.
    state.scheduledGapHours = 0;
    state.nextPublishAt = from.toISOString();
    return;
  }

  state.nextPublishAt = new Date(target).toISOString();
}

export function scheduleNextPublishAfterSuccess(state) {
  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
    scheduleNextDayFirstPublish(state);
    return;
  }

  const gapMs = randomPublishGapMs();
  state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
  state.nextPublishAt = new Date(Date.now() + gapMs).toISOString();
}

/** Fix stale slots that still point to today after the daily cap is reached. */
export function reconcilePublishSchedule(state, from = new Date()) {
  let changed = false;

  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY && state.nextPublishAt) {
    const nextKstDate = kstDateString(new Date(state.nextPublishAt));
    const todayKst = kstDateString(from);
    if (nextKstDate === todayKst) {
      scheduleNextDayFirstPublish(state, from);
      changed = true;
    }
  }

  if (
    state.publishCountToday < MAX_PUBLISH_PER_DAY &&
    state.nextPublishAt
  ) {
    const nextKst = kstDateString(new Date(state.nextPublishAt));
    const todayKst = kstDateString(from);
    if (nextKst > todayKst) {
      scheduleFirstPublishOfDay(state, from);
      changed = true;
    }
  }

  return changed;
}

/**
 * If today's first slot window passed but nothing published yet, publish on next cron.
 */
export function reconcileOverduePublishSlot(state, from = new Date()) {
  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) return false;

  const todayKst = kstDateString(from);
  if (state.publishDateKst !== todayKst) return false;
  if (!state.nextPublishAt) return false;

  const now = from.getTime();
  const nextMs = new Date(state.nextPublishAt).getTime();
  if (nextMs <= now) return false;

  const anchor = kstDayAnchorUtc(todayKst, KST_DAY_START_HOUR);
  const staleAfterMs = anchor.getTime() + MAX_PUBLISH_GAP_HOURS * 60 * 60 * 1000;

  if (now >= staleAfterMs) {
    state.scheduledGapHours = 0;
    state.nextPublishAt = from.toISOString();
    return true;
  }

  return false;
}

/** Repair catch-up slots that were saved without a real 4–6h gap after publish. */
export function reconcileStaleCatchUpSlot(state, from = new Date()) {
  if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) return false;
  if (!state.lastPublishAt || !state.nextPublishAt) return false;

  const now = from.getTime();
  const lastMs = new Date(state.lastPublishAt).getTime();
  const nextMs = new Date(state.nextPublishAt).getTime();
  const minGapMs = MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000;

  // Slot already due — never push it forward; publish should run on this cron.
  if (nextMs <= now) return false;

  if (nextMs - lastMs >= minGapMs) return false;

  const storedGapMs =
    typeof state.scheduledGapHours === "number" &&
    state.scheduledGapHours >= MIN_PUBLISH_GAP_HOURS
      ? state.scheduledGapHours * 3_600_000
      : null;
  const gapMs = storedGapMs ?? randomPublishGapMs();
  state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
  const candidate = lastMs + gapMs;
  state.nextPublishAt = new Date(
    candidate > now ? candidate : now,
  ).toISOString();
  return true;
}

export function ensureNextPublishAt(state) {
  reconcilePublishSchedule(state);
  reconcileOverduePublishSlot(state);
  reconcileStaleCatchUpSlot(state);

  if (state.nextPublishAt) return;

  if (state.lastPublishAt) {
    if (state.publishCountToday >= MAX_PUBLISH_PER_DAY) {
      scheduleNextDayFirstPublish(state);
      return;
    }

    const gapMs = randomPublishGapMs();
    const candidate = new Date(
      new Date(state.lastPublishAt).getTime() + gapMs,
    );
    state.nextPublishAt = (
      candidate.getTime() > Date.now() ? candidate : new Date()
    ).toISOString();
    state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
    return;
  }

  scheduleFirstPublishOfDay(state);
}

export function formatKst(isoString) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoString));
}
