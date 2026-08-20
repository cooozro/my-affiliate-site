#!/usr/bin/env node
/**
 * Repair draft posts with missing /images/posts/ files.
 * Run from site root (VPS /opt/aipick or GHA). Commits are done by caller (Selahim git push / GHA).
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fetchCoverImage } from "./lib/cover-image.mjs";
import { buildCoverAlts, resolveImageContext } from "./lib/image-query.mjs";
import { ensureImageApiEnv } from "./lib/image-api-env.mjs";
import {
  coverFileExists,
  publicPathFromWeb,
  repairCoverFrontmatter,
  stripBrokenImageRefs,
  stripCoverDuplicatesFromBody,
} from "./lib/draft-image-integrity.mjs";
import { repairModelDeepDiveBody } from "./lib/repair-model-deep-dive-body.mjs";

const SKIP_SLUGS = new Set([
  "welcome",
  "adsense-seo-checklist",
  "aipick-seo-precision-report",
]);

function isStolenSiblingCover(data) {
  const provider = String(data?.coverImageProvider ?? "");
  const cover = String(data?.coverImage ?? "");
  return provider === "topic-fallback-copy" || /cover-fallback\.(jpe?g|webp|png)$/i.test(cover);
}

function deleteCoverFile(webPath) {
  const abs = publicPathFromWeb(root, webPath);
  if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
}

const root = process.cwd();
const postsDir = path.join(root, "content", "posts");

function listDraftSlugs() {
  if (!fs.existsSync(postsDir)) return [];
  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function readLocale(slug, locale) {
  const filePath = path.join(postsDir, slug, `${locale}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { data, content: content.trim(), filePath };
}

function writeLocale(slug, locale, data, content) {
  const filePath = path.join(postsDir, slug, `${locale}.md`);
  fs.writeFileSync(filePath, matter.stringify(content, data), "utf8");
}

async function ensureCoverForSlug(slug) {
  if (SKIP_SLUGS.has(slug)) return { slug, action: "skip-internal" };
  const en = readLocale(slug, "en");
  if (!en.data.draft) return { slug, action: "skip-live" };

  if (isStolenSiblingCover(en.data)) {
    console.warn(`${slug}: discarding sibling-copied cover (must be unique)`);
    deleteCoverFile(en.data.coverImage);
    for (const locale of ["en", "ko"]) {
      const post = readLocale(slug, locale);
      const nextData = { ...post.data };
      delete nextData.coverImage;
      delete nextData.coverImageProvider;
      writeLocale(slug, locale, nextData, post.content);
    }
  }

  const fresh = readLocale(slug, "en");
  if (coverFileExists(root, slug, fresh.data) && !isStolenSiblingCover(fresh.data)) {
    let touched = false;
    for (const locale of ["en", "ko"]) {
      const post = readLocale(slug, locale);
      const coverFix = repairCoverFrontmatter(root, slug, post.data);
      let body = post.content;
      const stripped = stripBrokenImageRefs(root, body);
      if (stripped.changed) body = stripped.body;
      const coverDup = stripCoverDuplicatesFromBody(
        body,
        coverFix.data.coverImage,
      );
      if (coverDup.changed) body = coverDup.body;
      const deep = repairModelDeepDiveBody(coverFix.data, body, locale, { root });
      body = deep.body;
      if (
        coverFix.repaired ||
        stripped.changed ||
        coverDup.changed ||
        deep.repairs.length > 0
      ) {
        writeLocale(slug, locale, coverFix.data, body);
        touched = true;
      }
    }
    return { slug, action: touched ? "repaired-meta" : "ok" };
  }

  ensureImageApiEnv();
  const draftEn = readLocale(slug, "en");
  const topic = {
    id: draftEn.data.topicId,
    category: draftEn.data.topicCluster,
    topicCluster: draftEn.data.topicCluster,
    imageSearchKeywords: draftEn.data.imageSearchKeywords,
  };
  const indoorQueries =
    String(draftEn.data.topicId ?? "").includes("dehumid") ||
    String(draftEn.data.title ?? "").toLowerCase().includes("dehumid")
      ? ["dehumidifier"]
      : draftEn.data.imageSearchKeywords;
  const ctx = resolveImageContext(slug, {
    title: draftEn.data.title,
    tags: draftEn.data.tags,
    topicId: draftEn.data.topicId,
    topicCluster: draftEn.data.topicCluster,
    imageSearchKeywords: indoorQueries,
    imageQuery: indoorQueries?.[0],
    topic,
  });

  let meta = await fetchCoverImage(slug, ctx, { rootDir: root });
  if (!meta?.coverImage) {
    return { slug, action: "fetch-failed" };
  }

  const alts = buildCoverAlts(ctx);
  for (const locale of ["en", "ko"]) {
    const post = readLocale(slug, locale);
    let body = post.content;
    const stripped = stripBrokenImageRefs(root, body);
    if (stripped.changed) body = stripped.body;
    const merged = {
      ...post.data,
      ...meta,
      coverImageAlt: locale === "ko" ? alts.ko : alts.en,
      coverImageAltKo: alts.ko,
    };
    const coverDup = stripCoverDuplicatesFromBody(body, merged.coverImage);
    if (coverDup.changed) body = coverDup.body;
    const deep = repairModelDeepDiveBody(merged, body, locale, { root });
    writeLocale(slug, locale, merged, deep.body);
  }
  return { slug, action: "fetched", cover: meta.coverImage };
}

async function main() {
  const slugs = listDraftSlugs();
  const drafts = slugs.filter((slug) => {
    try {
      const en = readLocale(slug, "en");
      return Boolean(en.data.draft);
    } catch {
      return false;
    }
  });

  const results = [];
  for (const slug of drafts) {
    try {
      const r = await ensureCoverForSlug(slug);
      results.push(r);
      if (r.action !== "ok") console.log(`${slug}: ${r.action}${r.cover ? ` → ${r.cover}` : ""}`);
    } catch (err) {
      console.error(`${slug}: ERROR ${err.message}`);
      results.push({ slug, action: "error", error: err.message });
    }
  }

  const need = results.filter((r) =>
    ["fetch-failed", "error", "fetched", "repaired-meta"].includes(r.action),
  );
  if (need.length === 0) {
    console.log("No draft posts missing covers.");
  }
  console.log(JSON.stringify({ drafts: drafts.length, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
