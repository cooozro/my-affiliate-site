import type { Locale } from "@/lib/i18n/config";

/** Independent-publication tagline copy (5-C — do not edit outside guardian). */
export const publicationTagline: Record<Locale, string> = {
  en: "AI Pick & Report is an independent buying-guide desk that cross-checks public specs — not a hands-on hardware lab.",
  ko: "AI Pick & Report는 공개 스펙을 교차 검증하는 독립 구매 가이드 편집부이며, 실물을 측정하는 하드웨어 랩이 아닙니다.",
};

export function getPublicationTagline(locale: Locale): string {
  return publicationTagline[locale];
}
