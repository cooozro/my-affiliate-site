/**
 * FAQ section audit + auto-repair for published posts.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { inferPostTopic } from "./infer-post-topic.mjs";
import { writeLocaleFileWithBump } from "./post-updated-at.mjs";

export const FAQ_HEADING_RE =
  /^##\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*$/m;

const FAQ_QUESTION_RE = /^###\s+(.+)$/;

export const MIN_FAQ_BY_PROFILE = {
  "buying-guide": 3,
  "head-to-head": 3,
  "scenario-guide": 3,
  explainer: 5,
  checklist: 3,
  editorial: 0,
};

const INSERT_BEFORE_RE =
  /^##\s*(Related guides|관련 가이드|Final Verdict|최종 평가|Conclusion|결론)\s*$/m;

function postsDir(root) {
  return path.join(root, "content", "posts");
}

function faqHeading(locale) {
  return locale === "ko" ? "## 자주 묻는 질문" : "## FAQ";
}

function topicLabel(slug, data, locale) {
  const topic = inferPostTopic(slug, data);
  const tag = data.tags?.[0];
  if (locale === "ko") {
    return tag ?? topic.category ?? "이 제품";
  }
  return tag ?? topic.category ?? "this category";
}

function defaultFaqEntries(slug, locale, data, needed) {
  const subject = topicLabel(slug, data, locale);
  const pool =
    locale === "ko"
      ? [
          {
            q: `${subject} 구매 전 가장 먼저 확인할 항목은 무엇인가요?`,
            a: "방 크기·사용 패턴·설치 제약을 먼저 적어 두고, 그 조건에 맞는 스펙만 비교하세요. 스펙표만 보고 고르면 반품·교체 비용이 커질 수 있습니다.",
          },
          {
            q: "최저가 모델을 고르면 손해인가요?",
            a: "항상 그런 것은 아닙니다. 다만 필터·호환 액세서리·AS·소음·전력 같은 유지 비용이 낮은 모델이 장기적으로 더 나을 때가 많습니다.",
          },
          {
            q: "리뷰 평점만 믿어도 될까요?",
            a: "평점은 참고용으로만 쓰고, 본문의 비교 표·시나리오·단점 항목을 함께 보세요. 같은 평점이라도 사용 환경에 따라 체감이 크게 달라집니다.",
          },
          {
            q: "언제 다시 비교 목록을 업데이트해야 하나요?",
            a: "신형 출시, 가격 변동, 펌웨어 업데이트가 있을 때 후보를 다시 좁히세요. 특히 시즌성 제품은 출시 직후 한 달이 가장 변동이 큽니다.",
          },
          {
            q: "이 가이드의 추천은 어떻게 검증하나요?",
            a: "제조사 공개 스펙·설치 요건·공개 리뷰 패턴을 교차 확인합니다. 판매자 스크립트나 광고 문구는 추천 근거로 쓰지 않습니다.",
          },
        ]
      : [
          {
            q: `What should I verify first before buying ${subject}?`,
            a: "Write down room size, daily use pattern, and install constraints, then compare only models that fit. Spec-sheet shopping alone often leads to returns and hidden running costs.",
          },
          {
            q: "Is the cheapest option always a bad deal?",
            a: "Not always — but filter life, accessories, warranty, noise, and power use often favor a slightly higher-priced finalist over the lowest sticker price.",
          },
          {
            q: "Can I rely on star ratings alone?",
            a: "Use ratings as one signal. Cross-check comparison tables, scenario notes, and weakness bullets in the guide — the same score can feel very different by use case.",
          },
          {
            q: "When should I refresh my shortlist?",
            a: "After new model launches, price shifts, or firmware updates. Seasonal categories move fastest in the first month after release.",
          },
          {
            q: "How are recommendations in this guide validated?",
            a: "We cross-check public manufacturer specs, install requirements, and open review patterns — not seller scripts or ad copy.",
          },
        ];

  return pool.slice(0, needed);
}

function countFaqInBody(body) {
  const start = body.search(FAQ_HEADING_RE);
  if (start < 0) return 0;

  const section = body.slice(start);
  const nextH2 = section.slice(1).search(/^##\s+/m);
  const block = nextH2 >= 0 ? section.slice(0, nextH2 + 1) : section;
  return (block.match(/^###\s+/gm) ?? []).length;
}

function formatFaqBlock(locale, entries) {
  const lines = [faqHeading(locale), ""];
  for (const entry of entries) {
    lines.push(`### ${entry.q}`);
    lines.push("");
    lines.push(entry.a);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function insertFaqBlock(body, locale, entries) {
  const block = formatFaqBlock(locale, entries);
  const trimmed = body.trim();
  const match = trimmed.match(INSERT_BEFORE_RE);
  if (match?.index != null) {
    return `${trimmed.slice(0, match.index).trimEnd()}\n\n${block}\n\n${trimmed.slice(match.index).trimStart()}`.trim();
  }
  return `${trimmed}\n\n${block}`.trim();
}

/**
 * @returns {{ body: string, repairs: string[], changed: boolean }}
 */
export function repairFaqSectionInBody(body, locale, slug, data, options = {}) {
  const repairs = [];
  const profile = data.contentProfile ?? "buying-guide";
  const minFaq = options.minFaq ?? MIN_FAQ_BY_PROFILE[profile] ?? 3;
  if (minFaq <= 0) {
    return { body, repairs, changed: false };
  }

  const existing = countFaqInBody(body);
  if (existing >= minFaq) {
    return { body, repairs, changed: false };
  }

  const needed = minFaq - existing;
  const fillers = defaultFaqEntries(slug, locale, data, needed);

  let newBody;
  if (existing === 0) {
    newBody = insertFaqBlock(body, locale, fillers);
    repairs.push(
      `${slug}/${locale}.md: inserted FAQ section (${fillers.length} entries)`,
    );
  } else {
    const start = body.search(FAQ_HEADING_RE);
    const section = body.slice(start);
    const nextH2 = section.slice(1).search(/^##\s+/m);
    const blockEnd = nextH2 >= 0 ? start + nextH2 + 1 : body.length;
    const appendLines = fillers
      .map((entry) => `### ${entry.q}\n\n${entry.a}`)
      .join("\n\n");
    newBody = `${body.slice(0, blockEnd).trimEnd()}\n\n${appendLines}\n\n${body.slice(blockEnd).trimStart()}`.trim();
    repairs.push(
      `${slug}/${locale}.md: expanded FAQ ${existing} → ${existing + fillers.length} entries`,
    );
  }

  return {
    body: newBody,
    repairs,
    changed: newBody !== body.trim(),
  };
}

export function auditFaqSection(body, label, profile) {
  const minFaq = MIN_FAQ_BY_PROFILE[profile] ?? 0;
  if (minFaq <= 0) return [];

  if (!FAQ_HEADING_RE.test(body)) {
    return [`${label}: missing FAQ / 자주 묻는 질문 section`];
  }

  const count = countFaqInBody(body);
  if (count < minFaq) {
    return [
      `${label}: FAQ needs at least ${minFaq} entries (### headings, found ${count})`,
    ];
  }

  return [];
}

export function repairFaqSectionForPost(root, slug, options = {}) {
  const allRepairs = [];
  let anyChanged = false;

  for (const locale of ["en", "ko"]) {
    const filePath = path.join(postsDir(root), slug, `${locale}.md`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    if (data.draft && !options.includeDrafts) continue;

    const result = repairFaqSectionInBody(content.trim(), locale, slug, data, options);
    if (!result.changed) continue;

    writeLocaleFileWithBump(filePath, data, result.body, fs, matter);
    anyChanged = true;
    allRepairs.push(...result.repairs);
  }

  return { changed: anyChanged, repairs: allRepairs };
}

export function repairAllFaqSections(root = process.cwd(), options = {}) {
  const postsRoot = postsDir(root);
  if (!fs.existsSync(postsRoot)) {
    return { scanned: 0, changed: 0, repairs: [] };
  }

  const slugs = fs
    .readdirSync(postsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((s) => s !== "welcome" && s !== "adsense-seo-checklist");

  const summary = { scanned: 0, changed: 0, repairs: [] };
  for (const slug of slugs.sort()) {
    summary.scanned += 1;
    const result = repairFaqSectionForPost(root, slug, options);
    if (result.changed) summary.changed += 1;
    summary.repairs.push(...result.repairs);
  }
  return summary;
}
