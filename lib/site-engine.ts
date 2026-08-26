/**
 * AIPICK Next.js copy of the locked Selahim site-engine.
 * Keep in sync with core/site-engine/ — do not fork behavior.
 */
export type SiteEngineLocale = "en" | "ko";

export const TRANSPARENCY_NOTICE_EN =
  "This report is a cross-checked guide based on manufacturer-published specs and open user-review data. It is not a hands-on review of a physical unit we tested in-house.";

export const TRANSPARENCY_NOTICE_KO =
  "이 리포트는 제조사 공개 스펙 및 오픈된 사용자 리뷰 데이터를 기반으로 교차 분석한 가이드이며, 직접 실물 기기를 테스트한 리뷰가 아닙니다.";

export function transparencyNoticeText(locale: SiteEngineLocale): string {
  return locale === "ko" ? TRANSPARENCY_NOTICE_KO : TRANSPARENCY_NOTICE_EN;
}

export function transparencyNoticeMarkdown(locale: SiteEngineLocale): string {
  const text = transparencyNoticeText(locale);
  const label = locale === "ko" ? "투명성 고지" : "Transparency";
  return `> **${label}:** ${text}`;
}

export const PRICE_FALLBACK_EN =
  "Confirm live prices and promotions on the official retailer or manufacturer storefront. This page does not invent or hard-code a current street price.";

export const PRICE_FALLBACK_KO =
  "정확한 실시간 가격 및 프로모션은 공식 판매처에서 확인하세요. 이 페이지는 시세를 임의로 적어 두지 않습니다.";

export function priceFallbackText(locale: SiteEngineLocale): string {
  return locale === "ko" ? PRICE_FALLBACK_KO : PRICE_FALLBACK_EN;
}

const UNRESOLVED_PLACEHOLDER_RE =
  /\{\{\s*(?:usd_krw_rate|today|today_ko|today_locale|krw:[^}]+)\s*\}\}/gi;
const FAKE_PRICE_RE =
  /\$\s*XX\b|\$\s*\?\?|₩\s*\?+|가격\s*(미정|확인중|TBD)|TBD\s*price|0{3,}원|lorem\s*price/gi;

export function applyPriceFallback(
  content: string,
  locale: SiteEngineLocale,
  options?: { marketOk?: boolean },
): string {
  let out = content || "";
  const fallback = priceFallbackText(locale);
  if (options?.marketOk === false) {
    UNRESOLVED_PLACEHOLDER_RE.lastIndex = 0;
    out = out.replace(UNRESOLVED_PLACEHOLDER_RE, fallback);
  }
  FAKE_PRICE_RE.lastIndex = 0;
  out = out.replace(FAKE_PRICE_RE, fallback);
  return out;
}

export const STOCK_CAPTION_EN =
  "Staged category example image (not a photo of the actual product).";
export const STOCK_CAPTION_KO =
  "연출된 카테고리 예시 이미지 (실제 제품 실물 사진이 아님)";

const STOCK_PROVIDERS = new Set(["pexels", "pixabay", "unsplash", "stock"]);

export function isStockImageProvider(provider?: string | null): boolean {
  const key = String(provider || "").trim().toLowerCase();
  if (!key) return false;
  if (key === "press-kit" || key === "press" || key === "manufacturer") return false;
  return STOCK_PROVIDERS.has(key) || key.includes("stock");
}

export function formatStockCaption(
  locale: SiteEngineLocale,
  credit?: string | null,
): string {
  const honesty = locale === "ko" ? STOCK_CAPTION_KO : STOCK_CAPTION_EN;
  const raw = String(credit || "").trim();
  if (!raw) return honesty;
  if (
    raw.includes(honesty) ||
    /실물 사진이 아님|not a photo of the actual product/i.test(raw)
  ) {
    return raw;
  }
  return `${honesty} ${raw}`;
}

export function inferStockFromCredit(credit?: string | null): boolean {
  return /pexels|pixabay|unsplash|stock/i.test(String(credit || ""));
}

export function stripMethodologySections(body: string): string {
  let text = String(body || "").replace(
    /<h[23][^>]*>\s*(Analysis methodology|분석 방법론)[\s\S]*?(?=<h[123]|$)/gi,
    "",
  );
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^#{2,3}\s*(Analysis methodology|분석 방법론)\b/i.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^#{1,3}\s+\S/.test(line)) skipping = false;
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimStart();
}

export function stripTransparencyMarkdown(body: string): string {
  return String(body || "")
    .replace(/^>\s*\*\*(투명성 고지|Transparency):\*\*[^\n]*(\n+)?/i, "")
    .replace(
      /<aside[^>]*data-site-engine="transparency"[\s\S]*?<\/aside>\s*/i,
      "",
    );
}

export function coverCaption(
  locale: SiteEngineLocale,
  credit?: string | null,
  provider?: string | null,
): string | undefined {
  if (isStockImageProvider(provider) || (!provider && inferStockFromCredit(credit))) {
    return formatStockCaption(locale, credit);
  }
  return credit || undefined;
}
