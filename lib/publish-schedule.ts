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

function randomPublishGapMs() {
  const min = MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  const max = MAX_PUBLISH_GAP_HOURS * 60 * 60 * 1000;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomFirstSlotOffsetMs() {
  const minMinutes = MIN_PUBLISH_GAP_HOURS * 60;
  const maxMinutes = MAX_PUBLISH_GAP_HOURS * 60;
  const minutes =
    minMinutes + Math.floor(Math.random() * (maxMinutes - minMinutes + 1));
  return minutes * 60 * 1000;
}

function kstDayAnchorUtc(dateString: string, hour = KST_DAY_START_HOUR) {
  const { year, month, day } = parseKstDateString(dateString);
  return kstWallClockToUtc(year, month, day, hour, 0);
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
  state.nextPublishAt = new Date(
    tomorrowAnchor.getTime() + offsetMs,
  ).toISOString();
}

function scheduleFirstPublishOfDay(state: Record<string, unknown>, from = new Date()) {
  const offsetMs = randomFirstSlotOffsetMs();
  const todayKst = kstDateString(from);
  const anchor = kstDayAnchorUtc(todayKst, KST_DAY_START_HOUR);
  const target = anchor.getTime() + offsetMs;

  state.scheduledGapHours = Math.round((offsetMs / 3_600_000) * 100) / 100;

  if (target <= from.getTime()) {
    state.scheduledGapHours = 0;
    state.nextPublishAt = from.toISOString();
    return;
  }

  state.nextPublishAt = new Date(target).toISOString();
}

function previewResetDailyCounters(state: Record<string, unknown>, from = new Date()) {
  const today = kstDateString(from);
  if (state.publishDateKst !== today) {
    const previousDay = state.publishDateKst;
    const yesterdayCount =
      typeof state.publishCountToday === "number" ? state.publishCountToday : 0;
    state.publishDateKst = today;
    state.publishCountToday = 0;

    if (previousDay) {
      const missedSlot =
        yesterdayCount < MAX_PUBLISH_PER_DAY &&
        state.nextPublishAt &&
        from.getTime() >= new Date(String(state.nextPublishAt)).getTime();

      if (missedSlot) {
        state.scheduledGapHours = 0;
        state.nextPublishAt = from.toISOString();
      } else {
        scheduleFirstPublishOfDay(state, from);
      }
    } else if (!state.nextPublishAt) {
      scheduleFirstPublishOfDay(state, from);
    } else if (new Date(String(state.nextPublishAt)).getTime() <= from.getTime()) {
      state.scheduledGapHours = 0;
      state.nextPublishAt = from.toISOString();
    }
  }
}

function previewReconcilePublishSchedule(
  state: Record<string, unknown>,
  from = new Date(),
) {
  const publishCountToday =
    typeof state.publishCountToday === "number" ? state.publishCountToday : 0;

  if (publishCountToday >= MAX_PUBLISH_PER_DAY && state.nextPublishAt) {
    const nextKstDate = kstDateString(new Date(String(state.nextPublishAt)));
    const todayKst = kstDateString(from);
    if (nextKstDate === todayKst) {
      scheduleNextDayFirstPublish(state, from);
    }
  }

  if (publishCountToday < MAX_PUBLISH_PER_DAY && state.nextPublishAt) {
    const nextKst = kstDateString(new Date(String(state.nextPublishAt)));
    const todayKst = kstDateString(from);
    if (nextKst > todayKst) {
      scheduleFirstPublishOfDay(state, from);
    }
  }
}

function previewReconcileOverduePublishSlot(
  state: Record<string, unknown>,
  from = new Date(),
) {
  const publishCountToday =
    typeof state.publishCountToday === "number" ? state.publishCountToday : 0;
  if (publishCountToday >= MAX_PUBLISH_PER_DAY) return;

  const todayKst = kstDateString(from);
  if (state.publishDateKst !== todayKst || !state.nextPublishAt) return;

  const now = from.getTime();
  const nextMs = new Date(String(state.nextPublishAt)).getTime();
  if (nextMs <= now) return;

  const anchor = kstDayAnchorUtc(todayKst, KST_DAY_START_HOUR);
  const staleAfterMs =
    anchor.getTime() + MAX_PUBLISH_GAP_HOURS * 60 * 60 * 1000;

  if (now >= staleAfterMs) {
    state.scheduledGapHours = 0;
    state.nextPublishAt = from.toISOString();
  }
}

/** Fix catch-up slots saved without a real 4–6h gap after a publish today. */
function previewReconcileStaleCatchUpSlot(
  state: Record<string, unknown>,
  from = new Date(),
) {
  const publishCountToday =
    typeof state.publishCountToday === "number" ? state.publishCountToday : 0;
  if (
    publishCountToday >= MAX_PUBLISH_PER_DAY ||
    !state.lastPublishAt ||
    !state.nextPublishAt
  ) {
    return;
  }

  const lastMs = new Date(String(state.lastPublishAt)).getTime();
  const nextMs = new Date(String(state.nextPublishAt)).getTime();
  const minGapMs = MIN_PUBLISH_GAP_HOURS * 60 * 60 * 1000;

  if (nextMs - lastMs >= minGapMs) return;

  const gapMs = randomPublishGapMs();
  state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
  const candidate = lastMs + gapMs;
  state.nextPublishAt = new Date(
    candidate > from.getTime() ? candidate : from.getTime(),
  ).toISOString();
}

function previewEnsureNextPublishAt(state: Record<string, unknown>, from = new Date()) {
  previewReconcilePublishSchedule(state, from);
  previewReconcileOverduePublishSlot(state, from);
  previewReconcileStaleCatchUpSlot(state, from);

  if (state.nextPublishAt) return;

  if (state.lastPublishAt) {
    const publishCountToday =
      typeof state.publishCountToday === "number" ? state.publishCountToday : 0;

    if (publishCountToday >= MAX_PUBLISH_PER_DAY) {
      scheduleNextDayFirstPublish(state, from);
      return;
    }

    const gapMs = randomPublishGapMs();
    const candidate = new Date(
      new Date(String(state.lastPublishAt)).getTime() + gapMs,
    );
    state.nextPublishAt = (
      candidate.getTime() > from.getTime() ? candidate : from
    ).toISOString();
    state.scheduledGapHours = Math.round((gapMs / 3_600_000) * 100) / 100;
    return;
  }

  scheduleFirstPublishOfDay(state, from);
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

/** Preview-only schedule for admin — mirrors automation reconcile logic. */
export function previewPublishSchedule(
  rawState: Record<string, unknown>,
  from = new Date(),
): PublishSchedulePreview {
  const state = { ...rawState };
  previewResetDailyCounters(state, from);
  previewEnsureNextPublishAt(state, from);

  const publishCountToday =
    typeof state.publishCountToday === "number" ? state.publishCountToday : 0;
  const dailyCapReached = publishCountToday >= MAX_PUBLISH_PER_DAY;
  const nextPublishAt =
    typeof state.nextPublishAt === "string" ? state.nextPublishAt : null;
  const scheduledGapHours =
    typeof state.scheduledGapHours === "number" ? state.scheduledGapHours : null;

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
    publishDateKst:
      typeof state.publishDateKst === "string" ? state.publishDateKst : null,
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
