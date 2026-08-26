export const TRANSPARENCY_NOTICE_EN =
  "This report is a cross-checked guide based on manufacturer-published specs and open user-review data. It is not a hands-on review of a physical unit we tested in-house.";

export const TRANSPARENCY_NOTICE_KO =
  "이 리포트는 제조사 공개 스펙 및 오픈된 사용자 리뷰 데이터를 기반으로 교차 분석한 가이드이며, 직접 실물 기기를 테스트한 리뷰가 아닙니다.";

export function transparencyNoticeText(locale) {
  return locale === "ko" ? TRANSPARENCY_NOTICE_KO : TRANSPARENCY_NOTICE_EN;
}

export function transparencyNoticeMarkdown(locale) {
  const text = transparencyNoticeText(locale);
  const label = locale === "ko" ? "투명성 고지" : "Transparency";
  return `> **${label}:** ${text}`;
}

export function ensureTransparencyMarkdown(body, locale) {
  const marker =
    locale === "ko"
      ? "직접 실물 기기를 테스트한 리뷰가 아닙니다"
      : "not a hands-on review";
  if (String(body || "").includes(marker)) return body;
  return `${transparencyNoticeMarkdown(locale)}\n\n${String(body || "").trimStart()}`;
}

export const PRICE_FALLBACK_EN =
  "Confirm live prices and promotions on the official retailer or manufacturer storefront. This page does not invent or hard-code a current street price.";

export const PRICE_FALLBACK_KO =
  "정확한 실시간 가격 및 프로모션은 공식 판매처에서 확인하세요. 이 페이지는 시세를 임의로 적어 두지 않습니다.";

const UNRESOLVED_PLACEHOLDER_RE =
  /\{\{\s*(?:usd_krw_rate|today|today_ko|today_locale|krw:[^}]+)\s*\}\}/gi;
const FAKE_PRICE_RE =
  /\$\s*XX\b|\$\s*\?\?|₩\s*\?+|가격\s*(미정|확인중|TBD)|TBD\s*price|0{3,}원|lorem\s*price/gi;

export function priceFallbackText(locale) {
  return locale === "ko" ? PRICE_FALLBACK_KO : PRICE_FALLBACK_EN;
}

export function applyPriceFallback(content, locale, options = {}) {
  let out = String(content || "");
  const fallback = priceFallbackText(locale);
  if (options.marketOk === false) {
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

export function isStockImageProvider(provider) {
  const key = String(provider || "").trim().toLowerCase();
  if (!key) return false;
  if (key === "press-kit" || key === "press" || key === "manufacturer") return false;
  return STOCK_PROVIDERS.has(key) || key.includes("stock");
}

export function formatStockCaption(locale, credit) {
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

export function stripMethodologySections(body) {
  let text = String(body || "").replace(
    /<h[23][^>]*>\s*(Analysis methodology|분석 방법론)[\s\S]*?(?=<h[123]|$)/gi,
    "",
  );
  const lines = text.split("\n");
  const out = [];
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

export function prepareArticleBody(body, locale, options = {}) {
  let next = stripMethodologySections(body);
  next = ensureTransparencyMarkdown(next, locale);
  next = applyPriceFallback(next, locale, { marketOk: options.marketOk });
  return next;
}
