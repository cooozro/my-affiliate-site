import "server-only";

/** KO → EN 번역 (DeepSeek/OpenAI). HTML/Markdown 구조 유지. */
export async function translateManualPostKoToEn(input: {
  titleKo: string;
  descriptionKo?: string;
  bodyKo: string;
  tagsKo?: string[];
}): Promise<{
  titleEn: string;
  descriptionEn: string;
  bodyEn: string;
  tagsEn: string[];
}> {
  const { chatJsonCompletion } = await import(
    "../scripts/automation/llm-chat.mjs"
  );

  const tagsLine =
    input.tagsKo && input.tagsKo.length
      ? `Korean tags: ${input.tagsKo.join(", ")}`
      : "";

  const { article } = await chatJsonCompletion({
    temperature: 0.35,
    system: `You translate Korean affiliate blog posts to natural American English for aipick.shop.
Preserve HTML tags, attributes, image paths (/images/posts/...), and internal link paths exactly.
Return JSON only: { "titleEn": string, "descriptionEn": string (50-155 chars), "bodyEn": string, "tagsEn": string[] (≥3 SEO tags in English) }`,
    user: `Title (KO): ${input.titleKo}
${input.descriptionKo ? `Description (KO): ${input.descriptionKo}\n` : ""}${tagsLine}

Body (KO):
${input.bodyKo}`,
  });

  const parsed = article as Record<string, unknown>;
  const titleEn = String(parsed.titleEn ?? "").trim();
  const bodyEn = String(parsed.bodyEn ?? "").trim();
  if (!titleEn || !bodyEn) {
    throw new Error("번역 결과가 비어 있습니다 — LLM 키/한도를 확인하세요.");
  }

  return {
    titleEn,
    descriptionEn: String(parsed.descriptionEn ?? "").trim().slice(0, 160),
    bodyEn,
    tagsEn: Array.isArray(parsed.tagsEn)
      ? parsed.tagsEn.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
      : [],
  };
}
