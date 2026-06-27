/** Read-only publish schedule helpers for Next.js admin (no filesystem writes). */

export const MAX_PUBLISH_PER_DAY = 2;
export const KST_DAY_START_HOUR = 6;
export const MIN_PUBLISH_GAP_HOURS = 4;
export const MAX_PUBLISH_GAP_HOURS = 6;

function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function kstWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0));
}

function parseKstDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

function randomFirstSlotOffsetMs() {
  const minMinutes = MIN_PUBLISH_GAP_HOURS * 60;
  const maxMinutes = MAX_PUBLISH_GAP_HOURS * 60;
  const minutes =
    minMinutes + Math.floor(Math.random() * (maxMinutes - minMinutes + 1));
  return minutes * 60 * 1000;
}

function scheduleNextDayFirstPublish(
  state: Record<string, unknown>,
  from = new Date(),
) {
  const offsetMs = randomFirstSlotOffsetMs();
  const todayKst = kstDateString(from);
  const { year, month, day } = parseKstDateString(todayKst);
  const tomorrowAnchor = kstWallClockToUtc(
    year,
    month,
    day + 1,
    KST_DAY_START_HOUR,
    0,
  );

  state.scheduledGapHours = Math.round((offsetMs / 3_600_000) * 100) / 100;
  state.nextPublishAt = new Date(tomorrowAnchor.getTime() + offsetMs).toISOString();
}

/** Preview-only: does not persist. Returns adjusted nextPublishAt if stale. */
export function previewReconcilePublishSchedule(
  state: Record<string, unknown>,
  from = new Date(),
): string | null {
  const publishCountToday =
    typeof state.publishCountToday === "number" ? state.publishCountToday : 0;

  if (publishCountToday < MAX_PUBLISH_PER_DAY || !state.nextPublishAt) {
    return null;
  }

  const nextKstDate = kstDateString(new Date(String(state.nextPublishAt)));
  const todayKst = kstDateString(from);
  if (nextKstDate !== todayKst) {
    return null;
  }

  const preview = { ...state };
  scheduleNextDayFirstPublish(preview, from);
  return typeof preview.nextPublishAt === "string" ? preview.nextPublishAt : null;
}

export function formatKst(isoString: string) {
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
