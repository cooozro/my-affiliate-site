/**
 * FAQ section — re-exports audit (Next-safe) and repair (CLI/GHA).
 */

export {
  FAQ_HEADING_RE,
  MIN_FAQ_BY_PROFILE,
  auditFaqSection,
  countFaqInBody,
  extractFaqSectionText,
  isTemplatedFaqBody,
  needsFaqLlmRepair,
  repairFaqSectionInBody,
  scanTemplatedContentIssues,
} from "./faq-section-audit.mjs";

export {
  repairAllFaqSections,
  repairAllFaqSectionsWithLlm,
  repairFaqSectionForPost,
  repairFaqSectionForPostWithLlm,
  repairFaqSectionWithLlm,
  replaceFaqSection,
  sleep,
} from "./faq-section-repair.mjs";
