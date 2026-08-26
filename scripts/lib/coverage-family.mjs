/** Near-duplicate auto-write formats. buying-guide / explainer / checklist = one slot. */
export const COVERAGE_FAMILY = {
  "buying-guide": "guide",
  explainer: "guide",
  checklist: "guide",
  "head-to-head": "compare",
  "scenario-guide": "compare",
  "model-deep-dive": "deep-dive",
};

export function coverageFamily(contentProfile) {
  const profile = String(contentProfile ?? "buying-guide");
  return COVERAGE_FAMILY[profile] ?? profile;
}

/**
 * Block a new draft when this topic already has a post in the same coverage
 * family — published, draft, or AdSense noindex all count once they are in `coverage`.
 */
export function isTopicFamilyBlocked(topicId, contentProfile, coverage) {
  if (!contentProfile) return false;
  const entry = coverage.get(topicId);
  if (!entry) return false;
  const family = coverageFamily(contentProfile);
  const formats = [...entry.publishedFormats, ...entry.draftFormats];
  return formats.some((profile) => coverageFamily(profile) === family);
}
