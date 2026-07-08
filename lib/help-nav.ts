/**
 * Stable heading ids for in-article anchor links (e.g. #comparison-table).
 */

export const HELP_NAV_ANCHOR_HEADINGS: Record<string, string> = {
  "top 5 comparison table": "comparison-table",
  "top 5 비교표": "comparison-table",
  "related guides": "related-guides",
  "관련 가이드": "related-guides",
};

export function headingIdForHelpNav(headingText: string): string | undefined {
  const key = headingText.trim().toLowerCase();
  return HELP_NAV_ANCHOR_HEADINGS[key];
}
