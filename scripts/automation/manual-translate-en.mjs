/**
 * Translate content/posts/{slug}/ko.md → en.md using free path:
 * Gemini API Free → Google Cloud Translate (never DeepSeek/OpenAI).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { translatePostFields } from "./free-translate.mjs";

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

const result = await translatePostFields({
  direction: "ko-to-en",
  title: titleKo,
  description: descriptionKo,
  body: bodyKo,
  tags: tagsKo,
});

const titleEn = String(result.titleEn ?? "").trim();
const bodyEn = String(result.bodyEn ?? "").trim();
const descriptionEn = String(result.descriptionEn ?? "").trim().slice(0, 160);
const tagsEn = Array.isArray(result.tagsEn)
  ? result.tagsEn.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
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
enData.translationProvider = result.provider;
enData.translationModel = result.model;
if (enData.coverImage) {
  enData.coverImageAlt = titleEn;
}
delete enData.coverImageAltKo;

fs.mkdirSync(path.dirname(enPath), { recursive: true });
fs.writeFileSync(enPath, matter.stringify(`${bodyEn.trim()}\n`, enData), "utf8");
console.log(`translated ${slug} via ${result.provider}/${result.model}`);
