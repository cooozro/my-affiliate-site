/**
 * AIPICK markdown gates mapped from Selahim approval-writing modules
 * that help AdSense review — without injecting finance sources or a
 * cloned Practical-Tips H2 (those increase template risk on this site).
 *
 * Mapped:
 * - approval-tone-compliance: strip ads / sponsored chrome / spam CTAs
 * - voice-humanizer: EN+KO AI cliché sweep
 * - approval-format-rotation: drop the repeated methodology stump (/about holds it)
 * - pipeline heading floor: ≥4 H2 and ≥1 H3
 */

const AI_CLICHES_EN =
  /\b(in today's digital age|delve into|it's important to note|it is important to note|it is worth noting|as previously mentioned|in conclusion|in summary|to sum up|to summarize|in this article|needless to say|at the end of the day|when it comes to|unlock the power|game-changer|leverage synergies|revolutionary breakthrough|in the ever-evolving|a testament to|comprehensive guide to|sound familiar|here's the thing|here is the thing|let's dive in|lets dive in|without further ado|the bottom line is|it goes without saying|navigate the landscape|cutting-edge solution|seamlessly integrate|elevate your|empower your|in a nutshell|first and foremost)\b/gi;

const AI_CLICHES_KO =
  /결론적으로|한마디로|알고\s*계셨나요|알고\s*계십니까|놀랍게도|사실\s*말이지요|자[,，]\s*이제|본격적으로\s*알아보|지금부터\s*자세히|핵심만\s*말씀드리면|쉽게\s*말해|무엇보다\s*중요한\s*건|오늘\s*포스팅에서는|이번\s*글에서는|끝까지\s*읽어주시면|도움이\s*되셨길|유익하셨길|그래서\s*오늘은|정리하자면|요약하면|다시\s*말해|다름\s*아니라/g;

const AD_CHROME =
  /<!--\s*ad[- ]?break\s*-->|<aside\b[^>]*(?:adsense-slot|data-adsense)[^>]*>[\s\S]*?<\/aside>|<ins\b[^>]*adsbygoogle[^>]*>[\s\S]*?<\/ins>|https?:\/\/pagead2\.googlesyndication\.com[^\s)]+/gi;

const AD_PHRASES =
  /\b(sponsored placement|advertisement|adsense slot|광고 영역|스폰서 영역|애드센스 슬롯)\b/gi;

const COMMERCIAL_EN =
  /\b(buy now|click here|limited offer|act now|make money fast|guaranteed income|crypto pump)\b/gi;

const COMMERCIAL_KO =
  /지금\s*바로\s*구매|지금\s*구매하세요|한정\s*특가|클릭하세요|무조건\s*수익/g;

function countH2(markdown) {
  return [...markdown.matchAll(/^##\s+\S/gm)].length;
}

function countH3(markdown) {
  return [...markdown.matchAll(/^###\s+\S/gm)].length;
}

function stripMethodologyStump(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s+(Analysis methodology|분석 방법론)\s*$/i.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+\S/.test(line)) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function humanize(markdown) {
  let n = 0;
  let out = markdown.replace(AI_CLICHES_EN, () => {
    n += 1;
    return "notably";
  });
  out = out.replace(AI_CLICHES_KO, () => {
    n += 1;
    return "구체적으로";
  });
  return { markdown: out, aiClichéCount: n };
}

function stripAdChrome(markdown) {
  return markdown.replace(AD_CHROME, "").replace(AD_PHRASES, "");
}

function stripCommercialCtas(markdown, locale) {
  let n = 0;
  const enReplacement = "learn more";
  const koReplacement = "관련 정보를 확인";
  let out = markdown.replace(COMMERCIAL_EN, () => {
    n += 1;
    return locale === "ko" ? koReplacement : enReplacement;
  });
  out = out.replace(COMMERCIAL_KO, () => {
    n += 1;
    return koReplacement;
  });
  return { markdown: out, commercialCtaCount: n };
}

/**
 * @param {string} markdown
 * @param {{ locale?: "en" | "ko" }} [opts]
 */
export function applyAipickApprovalGates(markdown, opts = {}) {
  const notes = [];
  const locale = opts.locale ?? "en";
  let body = String(markdown ?? "");
  const beforeAds = body;
  body = stripAdChrome(body);
  if (body !== beforeAds) notes.push("stripped ad chrome");

  const beforeMethod = body;
  body = stripMethodologyStump(body);
  if (body !== beforeMethod) notes.push("stripped methodology stump");

  const commercial = stripCommercialCtas(body, locale);
  body = commercial.markdown;
  if (commercial.commercialCtaCount > 0) {
    notes.push(`softened ${commercial.commercialCtaCount} commercial CTA(s)`);
  }

  const voice = humanize(body);
  body = voice.markdown;
  if (voice.aiClichéCount > 0) {
    notes.push(`humanize removed ${voice.aiClichéCount} cliché(s)`);
  }

  const h2Count = countH2(body);
  const h3Count = countH3(body);
  if (h2Count < 4) {
    notes.push(`heading floor: ${h2Count} H2 < 4`);
  }
  if (h3Count < 1) {
    notes.push(`heading floor: ${h3Count} H3 < 1`);
  }

  const originalityIndex = Math.max(0, 100 - voice.aiClichéCount * 12);
  return {
    markdown: body.trim() + "\n",
    notes,
    h2Count,
    h3Count,
    originalityIndex,
    locale,
    blocked: h2Count < 4 || h3Count < 1,
  };
}
