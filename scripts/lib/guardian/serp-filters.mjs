/**
 * SERP result filtering — prioritize editorial/blog sources over shopping malls.
 */

/** @typedef {{ title: string, link: string, snippet: string, displayLink?: string }} SerpItem */

const SHOPPING_DOMAIN_SUFFIXES = [
  "coupang.com",
  "himart.co.kr",
  "e-himart.co.kr",
  "m.e-himart.co.kr",
  "ssg.com",
  "gmarket.co.kr",
  "11st.co.kr",
  "auction.co.kr",
  "lotteon.com",
  "lotte.com",
  "emart.com",
  "homeplus.co.kr",
  "wemakeprice.com",
  "tmon.co.kr",
  "interpark.com",
  "amazon.com",
  "amazon.co.kr",
  "costco.co.kr",
  "danawa.com",
  "enuri.com",
  "ably.com",
  "musinsa.com",
  "oliveyoung.co.kr",
  "kurly.com",
  "aliexpress.com",
];

const SHOPPING_HOST_EXACT = new Set([
  "shopping.naver.com",
  "smartstore.naver.com",
  "brand.naver.com",
  "m.smartstore.naver.com",
]);

const INFO_HOST_EXACT = new Set([
  "blog.naver.com",
  "m.blog.naver.com",
  "post.naver.com",
  "cafe.naver.com",
  "velog.io",
  "brunch.co.kr",
  "medium.com",
  "namu.wiki",
  "reddit.com",
  "quora.com",
]);

const INFO_DOMAIN_SUFFIXES = [
  "tistory.com",
  "velog.io",
  "brunch.co.kr",
  "wordpress.com",
  "github.io",
];

const BENCHMARK_SUFFIX_BY_TONE = {
  "question-led": "장단점",
  "case-study": "후기",
  "data-driven": "분석",
  "scenario-first": "사용법",
  "myth-bust": "비교",
  "checklist-hook": "구매가이드",
};

const BENCHMARK_SUFFIX_POOL = ["후기", "장단점", "분석", "사용법", "구매가이드", "비교"];

const SUFFIX_STRIP_RE =
  /\s+(후기|장단점|분석|사용법|구매가이드|비교|추천|가이드|리뷰)$/u;

export function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isShoppingHost(host) {
  if (!host) return true;
  if (SHOPPING_HOST_EXACT.has(host)) return true;
  return SHOPPING_DOMAIN_SUFFIXES.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export function isInformationalHost(host) {
  if (!host) return false;
  if (INFO_HOST_EXACT.has(host)) return true;
  return INFO_DOMAIN_SUFFIXES.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

/**
 * Drop shopping malls; rank blogs/editorial first.
 * @param {SerpItem[]} items
 * @returns {{ items: SerpItem[], stats: object }}
 */
export function filterAndRankSerpItems(items) {
  const rawCount = items.length;
  const nonShopping = items.filter((item) => !isShoppingHost(hostFromUrl(item.link)));
  const preferred = nonShopping.filter((item) => isInformationalHost(hostFromUrl(item.link)));
  const other = nonShopping.filter((item) => !isInformationalHost(hostFromUrl(item.link)));
  const ranked = [...preferred, ...other];

  return {
    items: ranked.slice(0, 10),
    stats: {
      rawCount,
      afterShoppingFilter: nonShopping.length,
      preferredCount: preferred.length,
      excludedShopping: rawCount - nonShopping.length,
    },
  };
}

export function enhanceBenchmarkKeyword(keyword, toneVariant = "data-driven") {
  const base = String(keyword).trim().replace(SUFFIX_STRIP_RE, "").trim();
  const suffix =
    BENCHMARK_SUFFIX_BY_TONE[toneVariant] ??
    BENCHMARK_SUFFIX_POOL[base.length % BENCHMARK_SUFFIX_POOL.length];

  if (/\s/.test(base) && /(후기|장단점|분석|사용법|구매가이드|비교|리뷰|가이드)/u.test(base)) {
    return base;
  }

  return `${base} ${suffix}`.trim();
}

export function summarizeSerpDomains(items) {
  return items.map((item) => hostFromUrl(item.link)).filter(Boolean);
}
