/**
 * LLM-generated FAQ — beginner questions, warm editorial answers.
 */

import {
  buildFaqLlmSystemPrompt,
  buildFaqLlmUserPrompt,
  validateFaqQuality,
} from "./faq-quality.mjs";

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for FAQ generation");
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
      temperature: 0.78,
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
    const raw = await callOpenAI([
      { role: "system", content: system },
      {
        role: "user",
        content:
          attempt === 0
            ? user
            : `${user}\n\nPrevious output rejected (${lastError}). Use conversational beginner questions and longer, friendlier answers. Never reuse banned template patterns.`,
      },
    ]);

    const check = validateFaqQuality(raw.faqs ?? raw.faq, locale, minCount);
    if (check.ok) return check.entries;
    lastError = check.reason;
  }

  throw new Error(`LLM FAQ validation failed for ${slug}/${locale}.md: ${lastError}`);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
