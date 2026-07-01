/** Read-only publish schedule helpers for Next.js admin (no filesystem writes). */

export const MAX_PUBLISH_PER_DAY = 2;
export const TARGET_DRAFT_COUNT = 2;
export const KST_DAY_START_HOUR = 6;
export const MIN_PUBLISH_GAP_HOURS = 4;
export const MAX_PUBLISH_GAP_HOURS = 6;

export type PublishSchedulePreview = {
  publishCountToday: number;
  publishDateKst: string | null;
  nextPublishAt: string | null;
  scheduledGapHours: number | null;
  nextPublishAtKst: string | null;
  gapLabel: string;
  slotOverdue: boolean;
  dailyCapReached: boolean;
};

function kstDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatGapLabel(
  gapHours: number | null,
  dailyCapReached: boolean,
): string {
  if (dailyCapReached) return "내일 06:00 + 4–6h";
  if (gapHours === null) return "—";
  if (gapHours === 0) return "즉시 (catch-up)";
  return `${gapHours}h (4–6h 랜덤)`;
}

/**
 * Preview-only schedule for admin — reads stored state as-is.
 * Does NOT re-randomize nextPublishAt (that caused the UI to jump between refreshes).
 */
export function previewPublishSchedule(
  rawState: Record<string, unknown>,
  from = new Date(),
): PublishSchedulePreview {
  const todayKst = kstDateString(from);
  const storedDateKst =
    typeof rawState.publishDateKst === "string" ? rawState.publishDateKst : null;
  const storedCount =
    typeof rawState.publishCountToday === "number"
      ? rawState.publishCountToday
      : 0;

  const publishCountToday =
    storedDateKst === todayKst ? storedCount : 0;
  const dailyCapReached = publishCountToday >= MAX_PUBLISH_PER_DAY;

  const nextPublishAt =
    typeof rawState.nextPublishAt === "string" ? rawState.nextPublishAt : null;
  const scheduledGapHours =
    typeof rawState.scheduledGapHours === "number"
      ? rawState.scheduledGapHours
      : null;

  const slotOverdue =
    !dailyCapReached &&
    nextPublishAt !== null &&
    new Date(nextPublishAt).getTime() <= from.getTime();

  const nextPublishAtKst = nextPublishAt
    ? slotOverdue
      ? `${formatKst(nextPublishAt)} → 곧 발행`
      : formatKst(nextPublishAt)
    : null;

  return {
    publishCountToday,
    publishDateKst: storedDateKst === todayKst ? storedDateKst : todayKst,
    nextPublishAt,
    scheduledGapHours,
    nextPublishAtKst,
    gapLabel: formatGapLabel(scheduledGapHours, dailyCapReached),
    slotOverdue,
    dailyCapReached,
  };
}

/** @deprecated Use previewPublishSchedule */
export function previewReconcilePublishScheduleLegacy(
  state: Record<string, unknown>,
  from = new Date(),
): string | null {
  const preview = previewPublishSchedule(state, from);
  return preview.nextPublishAt;
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
