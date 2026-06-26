export const MAX_PUBLISH_PER_DAY = 2;
export const TARGET_DRAFT_COUNT = 2;
export const MIN_PUBLISH_GAP_HOURS = 4;
export const MAX_PUBLISH_GAP_HOURS = 6;

export function randomPublishGapMs() {
  const min = MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  const max = MAX_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** First publish jitter after KST day rollover (15–120 minutes). */
export function randomDayStartJitterMs() {
  const min = 15 * 60 * 1000;
  const max = 120 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function scheduleNextPublishAfterSuccess(state) {
  const gapMs = randomPublishGapMs();
  state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
  state.nextPublishAt = new Date(Date.now() + gapMs).toISOString();
}

export function scheduleFirstPublishOfDay(state) {
  const jitterMs = randomDayStartJitterMs();
  state.scheduledGapHours = null;
  state.nextPublishAt = new Date(Date.now() + jitterMs).toISOString();
}

export function ensureNextPublishAt(state) {
  if (state.nextPublishAt) return;

  if (state.lastPublishAt) {
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
