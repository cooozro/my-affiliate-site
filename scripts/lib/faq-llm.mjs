/**
 * LLM-generated FAQ entries per post (OpenAI). Replaces generic template fillers.
 */

import { generateFaqFromArticleContent } from "./faq-from-content.mjs";

const FORBIDDEN_QUESTION_PATTERNS = [
  /구매 전 가장 먼저 확인할 항목/,
  /최저가 모델을 고르면 손해/,
  /리뷰 평점만 믿어도/,
  /언제 다시 비교 목록을 업데이트/,
  /이 가이드의 추천은 어떻게 검증/,
  /verify first before buying/i,
  /cheapest option always a bad deal/i,
  /rely on star ratings alone/i,
  /when should I refresh my shortlist/i,
  /how are recommendations in this guide validated/i,
];

function stripForPrompt(body, maxChars = 7000) {
  return body
    .replace(/##\s*(Related guides|관련 가이드)[\s\S]*?(?=\n##\s|$)/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

function validateFaqEntries(entries, locale, minCount) {
  if (!Array.isArray(entries) || entries.length < minCount) {
    return { ok: false, reason: `expected ≥${minCount} FAQs, got ${entries?.length ?? 0}` };
  }

  for (const entry of entries.slice(0, minCount)) {
    const q = String(entry?.q ?? "").trim();
    const a = String(entry?.a ?? "").trim();
    if (!q || !a || q.length < 12 || a.length < 40) {
      return { ok: false, reason: "FAQ entry too short" };
    }
    if (FORBIDDEN_QUESTION_PATTERNS.some((re) => re.test(q))) {
      return { ok: false, reason: `forbidden template question: ${q.slice(0, 60)}` };
    }
    if (locale === "ko" && /[a-z]{4,}/i.test(q) && !/PS5|Xbox|Switch|Wi-Fi|USB|BTU|CADR|ANC|LDAC/i.test(q)) {
      return { ok: false, reason: "Korean FAQ question looks English-heavy" };
    }
  }

  return { ok: true, entries: entries.slice(0, minCount) };
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for LLM FAQ generation");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty OpenAI FAQ response");
  return JSON.parse(text);
}

/**
 * @param {{ slug: string, locale: string, title: string, description: string, body: string, data: object, minCount?: number }} input
 * @returns {Promise<Array<{ q: string, a: string }>>}
 */
export async function generateFaqEntries(input) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return generateFaqFromArticleContent(input);
  }
  return generateFaqEntriesWithLlm(input);
}

/**
 * @param {{ slug: string, locale: string, title: string, description: string, body: string, data: object, minCount?: number }} input
 * @returns {Promise<Array<{ q: string, a: string }>>}
 */
export async function generateFaqEntriesWithLlm(input) {
  const { slug, locale, title, description, body, data } = input;
  const minCount = input.minCount ?? 3;
  const profile = data.contentProfile ?? "buying-guide";
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  const excerpt = stripForPrompt(body);

  const localeLabel = locale === "ko" ? "Korean" : "English";
  const system = `You write post-specific FAQ sections for an independent tech buying guide (AI Pick & Report).
Output strict JSON: { "faqs": [ { "q": "question", "a": "answer" } ] }
Rules:
- Write exactly ${minCount} FAQ pairs in ${localeLabel}
- Questions must reflect THIS article only (products, scenarios, specs, verdict in the text)
- Do NOT reuse generic shopping templates (cheapest model, star ratings only, "what to check first before buying", etc.)
- Answers: 2–3 sentences, concrete, no ads, no affiliate CTAs, no seller API claims
- Match the article's content profile: ${profile}`;

  const user = `Slug: ${slug}
Title: ${title}
Description: ${description}
Tags: ${tags}
Content profile: ${profile}

Article excerpt:
---
${excerpt}
---

Generate ${minCount} unique reader questions they would search on Google about THIS topic, with answers grounded in the excerpt.`;

  let lastError = "unknown";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await callOpenAI([
      { role: "system", content: system },
      {
        role: "user",
        content:
          attempt === 0
            ? user
            : `${user}\n\nPrevious output was rejected (${lastError}). Try again with more specific product/scenario questions.`,
      },
    ]);

    const check = validateFaqEntries(raw.faqs ?? raw.faq, locale, minCount);
    if (check.ok) return check.entries;
    lastError = check.reason;
  }

  throw new Error(`LLM FAQ validation failed for ${slug}/${locale}.md: ${lastError}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
