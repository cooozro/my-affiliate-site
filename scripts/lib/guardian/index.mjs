/**
 * Pipeline Guardian — public API (Phase 1).
 *
 * Import automation integrity, policy, and editorial standards only from here
 * or from deprecated shims at scripts/lib/{publish-integrity,content-policy,...}.mjs.
 *
 * Before changing any file in this folder: update GUARDIAN_CHANGELOG.md and get owner approval.
 */

export {
  MISLEADING_SOURCE_PATTERNS,
  FORMULAIC_TITLE_PATTERNS,
  TITLE_STYLE_GUIDE,
  REVIEW_FORMAT_GUIDE,
  METHODOLOGY_BLOCK_KO,
  METHODOLOGY_BLOCK_EN,
} from "./editorial-standards.mjs";

export {
  FORBIDDEN_AD_PATTERNS,
  FORBIDDEN_PHRASES,
  EN_TYPO_FIXES,
  KO_TYPO_FIXES,
  HANGUL_LATIN_TYPO_RE,
  repairContentPolicyText,
  auditContentPolicyText,
  auditContentPolicyTitle,
  sitePostUrls,
} from "./content-policy.mjs";

export {
  listAllPostSlugs,
  listPublishedPostSlugs,
  isPublishedSlug,
  validateReplenishWrittenSlug,
  validateReplenishTopicUnique,
  removeReplenishSlugArtifacts,
  isRequestTopicStale,
  revertPostSlugFromGit,
  reservedSlugListForPrompt,
  isCoverOnlyAutomationPath,
} from "./automation-guard.mjs";

export {
  INTEGRITY_PHASES,
  repairPostLocale,
  repairPost,
  verifyPostIntegrity,
  runPublishIntegrityGate,
  formatIntegrityReport,
  integrityIssuesFlat,
} from "./publish-integrity.mjs";
