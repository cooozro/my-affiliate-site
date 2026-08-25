#!/usr/bin/env node
/**
 * Re-fetch cover + inject body images for an existing model-deep-dive draft.
 * Prefers manufacturer Press Kit, then stock. Usage:
 *   node scripts/automation/enrich-model-deep-dive-images.mjs <slug>
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
import {
  fetchPressKitImages,
  mergePressAndStockFigures,
} from "../lib/press-kit-images.mjs";
import { buildCoverAlts, resolveImageContext } from "../lib/image-query.mjs";
import { writePost } from "./posts-fs.mjs";
import { passesModelDeepDiveCandidate } from "../lib/model-image-gate.mjs";

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
const en = matter(fs.readFileSync(enPath, "utf8"));
const ko = matter(fs.readFileSync(koPath, "utf8"));

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
  tags: [
    ...(en.data.tags || []),
    model.brand,
    model.name,
    "smartphone",
    "product photo",
  ],
  imageQuery: queries[0],
  imageSearchKeywords: queries,
  topicId: topic.id,
  topic,
  contentProfile: "model-deep-dive",
  modelPick: { primary: model },
};

console.log("Enrich images for", slug, "→", model.brand, model.name);

const press = await fetchPressKitImages(slug, model, {
  count: 2,
  preferRoles: ["cover", "lifestyle", "detail"],
});
const pressCover = press.images.find((p) => p.role === "cover") ?? press.images[0];

let coverMeta = null;
if (pressCover) {
  coverMeta = {
    coverImage: pressCover.path,
    coverImageAlt: pressCover.altEn,
    coverImageAltKo: pressCover.altKo,
    coverImageCredit: pressCover.credit,
    coverImageProvider: "press-kit",
    coverImageAssetId: pressCover.assetId,
    coverImageSourceUrl: pressCover.sourceUrl,
  };
  console.log("Cover: press-kit", pressCover.path);
} else {
  coverMeta = await fetchCoverImage(slug, imageInput, { forceRefresh: true });
  const ctx = resolveImageContext(slug, imageInput);
  const baseAlts = buildCoverAlts(ctx);
  const coverAlts = buildModelDeepDiveAlts(model, topic.id, "cover");
  if (coverMeta) {
    coverMeta.coverImageAlt = `${coverAlts.en} — ${baseAlts.en}`.slice(0, 200);
    coverMeta.coverImageAltKo = `${coverAlts.ko} — ${baseAlts.ko}`.slice(0, 200);
    const gate = passesModelDeepDiveCandidate(
      {
        provider: coverMeta.coverImageProvider,
        providerAlt: `${coverMeta.coverImageAlt} ${coverMeta.coverImageAltKo}`,
        imageUrl: coverMeta.coverImageSourceUrl,
      },
      model,
      { role: "cover" },
    );
    if (!gate.ok) {
      console.error(`Cover rejected by model gate: ${gate.reason}`);
      process.exit(2);
    }
  } else {
    console.error("Cover missing after press-kit + stock — abort");
    process.exit(2);
  }
  console.log("Cover: stock", coverMeta?.coverImage || "(none)");
}

const pressForBody = press.images.filter((p) => p.path !== pressCover?.path);
const needStock = Math.max(0, 2 - pressForBody.length);
let stockFigures = [];
if (needStock > 0) {
  const extras = await fetchAdditionalImages(
    slug,
    {
      ...imageInput,
      imageQuery: queries[1] ?? queries[0],
      modelImageRole: "body",
    },
    { count: needStock, filenamePrefix: "body", skipCurated: true },
  );
  const roles = ["lifestyle", "detail"];
  stockFigures = extras
    .map((img, i) => {
      const alts = buildModelDeepDiveAlts(model, topic.id, roles[i] ?? "detail");
      const gate = passesModelDeepDiveCandidate(
        {
          provider: img.provider || "stock",
          providerAlt: img.providerAlt || img.relevanceText || "",
          imageUrl: img.sourceUrl || img.path,
          searchQuery: img.searchQuery || "",
        },
        model,
        { role: "body" },
      );
      if (!gate.ok) {
        console.warn(`Body stock rejected: ${gate.reason}`);
        return null;
      }
      return {
        path: img.path,
        altEn: alts.en,
        altKo: alts.ko,
        credit: img.credit,
        source: "stock",
      };
    })
    .filter(Boolean);
}

let figures = mergePressAndStockFigures(pressForBody, stockFigures, 2);
if (figures.length === 0) figures = stockFigures;

/** Strip prior pipeline body images before re-insert. */
function stripBodyImages(body) {
  return body
    .replace(/\n*!?\[[^\]]*]\(\/images\/posts\/[^)]+\)\n*/g, "\n")
    .replace(/\n*\*[Ii]mage:[^*]+\*\n*/g, "\n")
    .replace(/\n*\*이미지:[^*]+\*\n*/g, "\n");
}

let enBody = insertModelDeepDiveBodyImages(stripBodyImages(en.content.trim()), figures, "en");
let koBody = insertModelDeepDiveBodyImages(stripBodyImages(ko.content.trim()), figures, "ko");

const shared = {
  ...en.data,
  ...(coverMeta ?? {}),
  draft: true,
  ...(press.entry?.galleryUrl ? { pressKitGallery: press.entry.galleryUrl } : {}),
};

writePost(
  slug,
  "en",
  {
    ...shared,
    title: en.data.title,
    description: en.data.description,
    tags: en.data.tags,
  },
  enBody,
);
writePost(
  slug,
  "ko",
  {
    ...shared,
    title: ko.data.title,
    description: ko.data.description,
    tags: ko.data.tags,
    coverImageAlt: shared.coverImageAltKo || shared.coverImageAlt,
  },
  koBody,
);

console.log("body figures:", figures.length);
console.log("press gallery:", press.entry?.galleryUrl || "(none)");
console.log("done");
