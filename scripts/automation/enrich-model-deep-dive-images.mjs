#!/usr/bin/env node
/**
 * Re-fetch cover + inject 1–2 body stock images for an existing model-deep-dive draft.
 * Usage: node scripts/automation/enrich-model-deep-dive-images.mjs <slug>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { ensureImageApiEnv } from "../lib/image-api-env.mjs";
import { fetchCoverImage, fetchAdditionalImages } from "../lib/cover-image.mjs";
import {
  buildModelDeepDiveAlts,
  buildModelDeepDiveSearchQueries,
  insertModelDeepDiveBodyImages,
} from "../lib/model-deep-dive-images.mjs";
import { buildCoverAlts, resolveImageContext } from "../lib/image-query.mjs";
import { writePost } from "./posts-fs.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot =
  process.env.AIPICK_SITE_ROOT?.trim() || path.resolve(scriptDir, "../..");
process.chdir(siteRoot);

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node enrich-model-deep-dive-images.mjs <slug>");
  process.exit(1);
}

ensureImageApiEnv();

const enPath = path.join(siteRoot, "content/posts", slug, "en.md");
const koPath = path.join(siteRoot, "content/posts", slug, "ko.md");
const enRaw = fs.readFileSync(enPath, "utf8");
const koRaw = fs.readFileSync(koPath, "utf8");
const en = matter(enRaw);
const ko = matter(koRaw);

const model = {
  brand: en.data.modelPickBrand || "Samsung",
  name: en.data.modelPickName || "Galaxy Z Fold6",
  nameKo: "갤럭시 Z 폴드6",
  id: en.data.modelPickId || "galaxy-z-fold-6",
};
const topic = {
  id: en.data.topicId || "flagship-smartphones",
  imageQuery: "flagship smartphone product photo",
};

const queries = buildModelDeepDiveSearchQueries(model, topic);
const imageInput = {
  title: en.data.title,
  tags: [...(en.data.tags || []), model.brand, model.name, "smartphone", "product photo"],
  imageQuery: queries[0],
  imageSearchKeywords: queries,
  topicId: topic.id,
  topic,
};

console.log("Enrich images for", slug, "→", model.brand, model.name);

const cover = await fetchCoverImage(slug, imageInput, { forceRefresh: true });
const extras = await fetchAdditionalImages(slug, {
  ...imageInput,
  imageQuery: queries[1] ?? queries[0],
  imageSearchKeywords: queries,
}, { count: 2, filenamePrefix: "body", skipCurated: true });

const ctx = resolveImageContext(slug, imageInput);
const baseAlts = buildCoverAlts(ctx);
const coverAlts = buildModelDeepDiveAlts(model, topic.id, "cover");

const shared = {
  ...en.data,
  ...(cover ?? {}),
  coverImageAlt: cover
    ? `${coverAlts.en} — ${baseAlts.en}`.slice(0, 200)
    : en.data.coverImageAlt,
  coverImageAltKo: cover
    ? `${coverAlts.ko} — ${baseAlts.ko}`.slice(0, 200)
    : en.data.coverImageAltKo,
};

const roles = ["lifestyle", "detail"];
const figures = extras.map((img, i) => {
  const alts = buildModelDeepDiveAlts(model, topic.id, roles[i] ?? "detail");
  return { path: img.path, altEn: alts.en, altKo: alts.ko, credit: img.credit };
});

let enBody = insertModelDeepDiveBodyImages(en.content.trim(), figures, "en");
let koBody = insertModelDeepDiveBodyImages(ko.content.trim(), figures, "ko");

writePost(slug, "en", {
  ...shared,
  title: en.data.title,
  description: en.data.description,
  tags: en.data.tags,
  draft: true,
}, enBody);
writePost(slug, "ko", {
  ...shared,
  title: ko.data.title,
  description: ko.data.description,
  tags: ko.data.tags,
  coverImageAlt: shared.coverImageAltKo || shared.coverImageAlt,
  draft: true,
}, koBody);

console.log("cover:", shared.coverImage || "(none)");
console.log("body figures:", figures.length);
console.log("done");
