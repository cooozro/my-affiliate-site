import type { Locale } from "@/lib/i18n/config";

const RELATED_HEADING: Record<Locale, string> = {
  en: "## Related guides",
  ko: "## 관련 가이드",
};

/**
 * Split markdown after the Related guides section so a publication tagline
 * can render before the remaining sections (checklist, final verdict).
 */
export function splitAfterRelatedGuides(
  content: string,
  locale: Locale,
): { beforeTagline: string; afterTagline: string } | null {
  const heading = RELATED_HEADING[locale];
  const lines = content.split("\n");
  let relatedIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === heading) {
      relatedIdx = i;
      break;
    }
  }

  if (relatedIdx === -1) return null;

  let nextSectionIdx = -1;
  for (let i = relatedIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      nextSectionIdx = i;
      break;
    }
  }

  if (nextSectionIdx === -1) return null;

  return {
    beforeTagline: lines.slice(0, nextSectionIdx).join("\n"),
    afterTagline: lines.slice(nextSectionIdx).join("\n"),
  };
}
