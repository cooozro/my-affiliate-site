/** Suppress operational / duplicate alerts in aipick.shop admin UI. */

const OFF_SEASON_RE =
  /off-season topic|blocked until in-season|시즌\s*외|비시즌/i;

const OPERATIONAL_HEALTH_CODES = new Set([
  "low-draft-buffer",
  "publish-gap-wait",
  "draft-future-display-date",
  "draft-topic-diversity-blocked",
  "no-publishable-drafts",
  "stale-cursor-replenish",
]);

export function isOperationalAuditIssue(issue: string): boolean {
  return OFF_SEASON_RE.test(issue);
}

export function filterManualReviewQueue<
  T extends { issues: string[] },
>(items: T[]): T[] {
  return items
    .map((item) => ({
      ...item,
      issues: item.issues.filter((issue) => !isOperationalAuditIssue(issue)),
    }))
    .filter((item) => item.issues.length > 0);
}

export function filterHealthIssuesForAdmin(
  issues: Array<{ code: string; message: string; severity: string }>,
): Array<{ code: string; message: string; severity: string }> {
  return issues.filter((issue) => {
    if (OPERATIONAL_HEALTH_CODES.has(issue.code)) return false;
    if (issue.code === "draft-integrity-issues") return false;
    if (issue.code === "overdue-publish-slot" && issue.severity === "warning") {
      return false;
    }
    return issue.severity === "error";
  });
}

export function shouldHideReplenishBanner(
  request: Record<string, unknown> | null,
): boolean {
  if (!request || request.status !== "pending") return false;
  const since =
    typeof request.requestedAt === "string"
      ? new Date(request.requestedAt).getTime()
      : NaN;
  if (!Number.isFinite(since)) return false;
  const ageMin = (Date.now() - since) / 60_000;
  return ageMin > 48 * 60;
}
