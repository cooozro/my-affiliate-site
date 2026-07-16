/**
 * Heuristic AdSense quality score for published posts.
 * Skips draft / editorial / noindex (AdSense-visible set).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const root = path.join(process.cwd(), "content/posts");
const outPath = path.join(process.cwd(), "data/automation/adsense-quality-score.json");

const OEM = /\b[A-Z][A-Za-z0-9]{1,}[0-9][A-Za-z0-9-]{2,}\b/g;
const BRANDS =
  /\b(Samsung|LG|Sony|Apple|Dyson|Bosch|Frigidaire|Midea|Whirlpool|GE|Electrolux|Dell|AOC|Xiaomi|Shark|Roborock|iRobot|Bissell|Tineco|Duxtop|Empava|Vornado|Rowenta|Honeywell|Lasko|Dreo|Winix|Levoit|TCL|Maytag|Anker|Soundcore|Fitbit|Amazfit|Cosori|eufy|Bose|JBL|Google|Amazon|Haier|Govee|hOmeLabs|CalDigit|Keychron|Logitech|Sony|GoPro|DJI|Brita|TOTO|Panasonic|Nespresso|Breville|Sony|Sony)\b/gi;
const PICK = /\*\*(추천|Recommended pick)[:：]?[^*\n]*\*\*/gi;
const SCENARIO = /^##\s*(시나리오:|Scenario:)/gim;
const PRODUCT_H2 = /^##\s*\d+\.\s+/gm;
const EXPERIENCE =
  /(편집부\s*(현장\s*검증|분석|교차\s*검증)|공개\s*스펙\s*(교차\s*검증|재검토)|교차\s*검증한\s*결과|field\s*check|cross-check|cross-checked|Editorial\s*finding|editorial\s*field|After\s+cross-checking|this\s+report)/i;
const WHY =
  /(왜\s*(사|고르|추천)|가성비|패스|비추|Who should skip|Analysis takeaway|분석 요약|실제\s*구매\s*기준|cost-effectiveness|편집부\s*한줄평|Editorial note)/i;

function isNoindex(data) {
  if (data.noindex === true || data.noindex === "true") return true;
  const robots = String(data.robots || "");
  return /\bnoindex\b/i.test(robots);
}

function scorePost(slug) {
  const koPath = path.join(root, slug, "ko.md");
  const enPath = path.join(root, slug, "en.md");
  if (!fs.existsSync(koPath) || !fs.existsSync(enPath)) return null;
  const ko = matter(fs.readFileSync(koPath, "utf8"));
  const en = matter(fs.readFileSync(enPath, "utf8"));
  if (ko.data.draft) return null;
  if (ko.data.tags?.includes("internal")) return null;
  const profile = ko.data.contentProfile || en.data.contentProfile || "unknown";
  if (profile === "editorial") return null;

  const noindex = isNoindex(ko.data) || isNoindex(en.data);

  const koBody = ko.content.trim();
  const enBody = en.content.trim();
  const koChars = koBody.length;
  const enBytes = Buffer.byteLength(enBody, "utf8");
  const oemKo = new Set(koBody.match(OEM) || []);
  const brandsKo = new Set(
    (koBody.match(BRANDS) || []).map((b) => b.toLowerCase()),
  );
  const picks =
    (koBody.match(PICK) || []).length + (enBody.match(PICK) || []).length;
  const products = (koBody.match(PRODUCT_H2) || []).length;
  const scenarios = (koBody.match(SCENARIO) || []).length;
  const hasExp = EXPERIENCE.test(koBody) || EXPERIENCE.test(enBody);
  const hasWhy = WHY.test(koBody);
  const tables = (koBody.match(/\|.+\|/g) || []).length;
  const faq = (koBody.match(/^###\s+/gm) || []).length;
  const title = String(ko.data.title || "");
  const topicId = ko.data.topicId || en.data.topicId || "";
  const angle = ko.data.contentAngle || en.data.contentAngle || "";
  const date = ko.data.date || "";
  const publishedAt = ko.data.publishedAt || "";

  let lengthScore = 0;
  if (koChars >= 6500) lengthScore = 25;
  else if (koChars >= 4500) lengthScore = 20;
  else if (koChars >= 3500) lengthScore = 12;
  else if (koChars >= 2500) lengthScore = 6;
  else lengthScore = 0;

  const modelCount = oemKo.size;
  let specScore = 0;
  if (modelCount >= 5) specScore += 15;
  else if (modelCount >= 3) specScore += 10;
  else if (modelCount >= 1) specScore += 5;
  if (brandsKo.size >= 4) specScore += 8;
  else if (brandsKo.size >= 2) specScore += 5;
  else if (brandsKo.size >= 1) specScore += 2;
  if (picks >= 3 || products >= 3) specScore += 7;
  else if (picks >= 1 || products >= 1) specScore += 3;
  // Named shortlist section
  if (/편집부가 선정한 대표 모델|Models this report shortlists/.test(koBody + enBody)) {
    specScore = Math.min(30, specScore + 5);
  }

  let judge = 0;
  if (hasWhy) judge += 10;
  if (hasExp) judge += 10;
  if (/최종 평가|Final Verdict/.test(koBody) || /Final Verdict/.test(enBody)) judge += 5;

  let struct = 0;
  if (/편집부 개요|Editorial Overview/.test(koBody + enBody)) struct += 4;
  if (/분석 방법론|Analysis methodology/.test(koBody + enBody)) struct += 4;
  if (tables >= 3) struct += 4;
  else if (tables >= 1) struct += 2;
  if (faq >= 3) struct += 4;
  if (/관련 가이드|Related guides/.test(koBody + enBody)) struct += 2;
  if (enBytes >= 5000) struct += 2;

  const total = Math.min(100, lengthScore + specScore + judge + struct);

  const flags = [];
  if (koChars < 3500) flags.push("thin-ko");
  if (modelCount < 2 && brandsKo.size < 2) flags.push("generic-no-models");
  if (picks === 0 && products === 0 && scenarios === 0) {
    flags.push("no-named-sections");
  }
  if (!hasExp) flags.push("no-editorial-signal");
  if (koChars >= 4500 && modelCount >= 3 && hasWhy) flags.push("strong-candidate");
  if (angle || String(topicId).startsWith("meta-")) flags.push("meta-angle");
  if (noindex) flags.push("noindex");

  let band = "C";
  if (total >= 75) band = "A";
  else if (total >= 60) band = "B";
  else if (total >= 45) band = "C";
  else if (total >= 30) band = "D";
  else band = "F";

  let action = "monitor";
  if (noindex) action = "hidden-noindex";
  else if (
    band === "F" ||
    band === "D" ||
    flags.includes("thin-ko") ||
    flags.includes("generic-no-models")
  ) {
    action = "hide-or-rewrite";
  } else if (band === "C") {
    action = "deepen";
  } else if (band === "B") {
    action = "polish";
  } else {
    action = "keep-hero";
  }

  let priority = "P4";
  if (noindex) priority = "P1-hidden";
  else if (band === "D" || flags.includes("thin-ko")) priority = "P1";
  else if (flags.includes("generic-no-models")) priority = "P2";
  else if (band === "C") priority = "P3";
  else if (band === "B") priority = "P4";
  else priority = "P5";

  return {
    slug,
    title,
    profile,
    topicId,
    angle,
    date,
    publishedAt,
    noindex,
    koChars,
    enBytes,
    modelCount,
    brandCount: brandsKo.size,
    picks,
    products,
    scenarios,
    hasExp,
    hasWhy,
    tables,
    faq,
    lengthScore,
    specScore,
    judge,
    struct,
    total,
    band,
    action,
    flags,
    models: [...oemKo].slice(0, 12),
    priority,
  };
}

const slugs = fs
  .readdirSync(root)
  .filter((d) => fs.statSync(path.join(root, d)).isDirectory());

const all = slugs.map(scorePost).filter(Boolean);
const visible = all.filter((r) => !r.noindex);
const hidden = all.filter((r) => r.noindex);

const avg = (rows) =>
  rows.length
    ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length)
    : 0;

const bands = (rows) =>
  rows.reduce((a, r) => {
    a[r.band] = (a[r.band] || 0) + 1;
    return a;
  }, {});

const actions = (rows) =>
  rows.reduce((a, r) => {
    a[r.action] = (a[r.action] || 0) + 1;
    return a;
  }, {});

const topicMap = {};
for (const r of visible) {
  const t = r.topicId || "(none)";
  topicMap[t] = (topicMap[t] || 0) + 1;
}
const dupTopics = Object.entries(topicMap)
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1]);

visible.sort((a, b) => a.total - b.total || a.slug.localeCompare(b.slug));

const payload = {
  generatedAt: new Date().toISOString(),
  counted: visible.length,
  avg: avg(visible),
  avgIncludingHidden: avg(all),
  hiddenCount: hidden.length,
  bands: bands(visible),
  actions: actions(visible),
  priorities: visible.reduce((a, r) => {
    a[r.priority] = (a[r.priority] || 0) + 1;
    return a;
  }, {}),
  dupTopics,
  hidden: hidden.map((r) => ({
    slug: r.slug,
    total: r.total,
    band: r.band,
    title: r.title,
  })),
  rows: visible,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      visible: payload.counted,
      avg: payload.avg,
      avgAll: payload.avgIncludingHidden,
      hidden: payload.hiddenCount,
      bands: payload.bands,
      priorities: payload.priorities,
      lowest5: visible.slice(0, 5).map((r) => `${r.total} ${r.slug}`),
      top5: [...visible]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((r) => `${r.total} ${r.slug}`),
    },
    null,
    2,
  ),
);
