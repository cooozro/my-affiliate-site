/**
 * Translate content/posts/{slug}/ko.md → en.md using the same LLM keys
 * as the scheduler (DEEPSEEK_API_KEY preferred, else OPENAI_API_KEY).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { chatJsonCompletion } from "./llm-chat.mjs";

const slug = (process.env.SLUG || "").trim();
if (!slug) {
  console.error("SLUG env required");
  process.exit(1);
}

const koPath = path.join("content", "posts", slug, "ko.md");
const enPath = path.join("content", "posts", slug, "en.md");
if (!fs.existsSync(koPath)) {
  console.error(`missing ${koPath}`);
  process.exit(1);
}

const { data: koData, content: bodyKo } = matter(fs.readFileSync(koPath, "utf8"));
const titleKo = String(koData.title ?? "");
const descriptionKo = String(koData.description ?? "");
const tagsKo = Array.isArray(koData.tags) ? koData.tags.map(String) : [];

const { article, provider, model } = await chatJsonCompletion({
  temperature: 0.35,
  system: `You translate Korean affiliate blog posts to natural American English for aipick.shop.
Preserve HTML tags, attributes, image paths (/images/posts/...), and internal link paths exactly.
Keep brand/product names unchanged.
Return JSON only: { "titleEn": string, "descriptionEn": string (50-155 chars), "bodyEn": string, "tagsEn": string[] (≥3 SEO tags in English) }`,
  user: `Title (KO): ${titleKo}
Description (KO): ${descriptionKo}
Korean tags: ${tagsKo.join(", ")}

Body (KO):
${bodyKo}`,
});

const titleEn = String(article.titleEn ?? "").trim();
const bodyEn = String(article.bodyEn ?? "").trim();
const descriptionEn = String(article.descriptionEn ?? "").trim().slice(0, 160);
const tagsEn = Array.isArray(article.tagsEn)
  ? article.tagsEn.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
  : [];

if (!titleEn || !bodyEn) {
  throw new Error("empty translation result");
}

const enData = { ...koData };
enData.title = titleEn;
enData.description = descriptionEn || titleEn.slice(0, 155);
enData.tags = tagsEn.length >= 3 ? tagsEn : tagsKo;
enData.updatedAt = new Date().toISOString();
enData.enTranslationPending = false;
if (enData.coverImage) {
  enData.coverImageAlt = titleEn;
}
delete enData.coverImageAltKo;

fs.mkdirSync(path.dirname(enPath), { recursive: true });
fs.writeFileSync(enPath, matter.stringify(`${bodyEn.trim()}\n`, enData), "utf8");
console.log(`translated ${slug} via ${provider}/${model}`);
