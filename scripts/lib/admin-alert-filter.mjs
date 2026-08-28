/**
 * Suppress operational / duplicate alerts in aipick.shop admin UI.
 * Real module defects still surface in Posts row actions & publish errors.
 */

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

/** Daily audit / health strings that are expected ops state, not code defects. */
export function isOperationalAuditIssue(issue) {
  const text = String(issue ?? "");
  return OFF_SEASON_RE.test(text);
}

export const REPAIRABLE_PUBLISH_ISSUE_RE =
  /in-body product\/lifestyle image|Who should buy|이런 분께 추천|Who should skip|이런 분은 패스/i;

export function isRepairablePublishIssue(issue) {
  return REPAIRABLE_PUBLISH_ISSUE_RE.test(String(issue ?? ""));
}

const AUDIT_ISSUE_NOISE_RE =
  /Related guides has|English body too short|already occupied|does not match a USD MSRP/i;

export function isManualReviewNoiseIssue(issue) {
  const text = String(issue ?? "");
  return isOperationalAuditIssue(text) || AUDIT_ISSUE_NOISE_RE.test(text);
}

export function filterManualReviewQueue(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const issues = (item.issues ?? []).filter(
        (issue) => !isManualReviewNoiseIssue(issue),
      );
      return { ...item, issues };
    })
    .filter((item) => item.issues.length > 0);
}

export function filterHealthIssuesForAdmin(issues) {
  if (!Array.isArray(issues)) return [];
  return issues.filter((issue) => {
    if (OPERATIONAL_HEALTH_CODES.has(issue.code)) return false;
    if (issue.code === "draft-integrity-issues") return false;
    if (issue.code === "overdue-publish-slot" && issue.severity === "warning") {
      return false;
    }
    return issue.severity === "error";
  });
}

/** Stale cursor replenish pending >48h — queue is stuck; hide banner noise. */
export function shouldHideReplenishBanner(request) {
  if (!request || request.status !== "pending") return false;
  const since = request.requestedAt
    ? new Date(request.requestedAt).getTime()
    : NaN;
  if (!Number.isFinite(since)) return false;
  const ageMin = (Date.now() - since) / 60_000;
  return ageMin > 48 * 60;
}
