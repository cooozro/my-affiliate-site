/**
 * FAQ generation via Cursor Agent (Plan A — no OpenAI).
 */

import {
  buildFaqLlmSystemPrompt,
  buildFaqLlmUserPrompt,
  validateFaqQuality,
} from "./faq-quality.mjs";

function extractJsonObject(text) {
  const raw = String(text ?? "").trim();
  if (!raw) throw new Error("Empty Cursor FAQ response");

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Cursor FAQ response did not contain JSON");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

async function callCursorForFaq(system, user) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required for FAQ generation");
  }

  const { Agent } = await import("@cursor/sdk");

  const prompt = `${system}

---

${user}

Reply with ONLY valid JSON (no markdown prose outside the object):
{ "faqs": [ { "q": "...", "a": "..." } ] }`;

  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: process.env.CURSOR_FAQ_MODEL ?? "composer-2.5" },
    local: { cwd: process.cwd(), settingSources: [] },
  });

  if (result.status === "error") {
    throw new Error(`Cursor agent FAQ failed: ${result.id ?? "unknown"}`);
  }

  return extractJsonObject(result.result);
}

/**
 * @param {{ slug: string, locale: string, title: string, description: string, body: string, data: object, minCount?: number }} input
 * @returns {Promise<Array<{ q: string, a: string }>>}
 */
export async function generateFaqEntries(input) {
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

  const system = buildFaqLlmSystemPrompt(locale, minCount, profile);
  const user = buildFaqLlmUserPrompt({
    slug,
    locale,
    title,
    description,
    body,
    data,
    minCount,
  });

  let lastError = "unknown";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const raw = await callCursorForFaq(
      system,
      attempt === 0
        ? user
        : `${user}\n\nPrevious output rejected (${lastError}). Use conversational beginner questions and longer, friendlier answers. Never reuse banned template patterns.`,
    );

    const check = validateFaqQuality(raw.faqs ?? raw.faq, locale, minCount);
    if (check.ok) return check.entries;
    lastError = check.reason;
  }

  throw new Error(`FAQ validation failed for ${slug}/${locale}.md: ${lastError}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
