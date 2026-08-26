#!/usr/bin/env node
/**
 * Repair leaked enrichment artifacts in AIPICK markdown:
 * HTML comments, numbered shortlist stumps, mashed model tokens,
 * and cloned 근거/메모 cells.
 *
 * Usage (from AIPICK repo root):
 *   node scripts/repair-enrichment-artifacts.mjs
 *   node scripts/repair-enrichment-artifacts.mjs 2026-heatwave-blackout-home-readiness-checklist
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import matter from "gray-matter";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function resolveLocal(relatives) {
  for (const rel of relatives) {
    const full = path.join(HERE, rel);
    if (fs.existsSync(full)) return pathToFileURL(full).href;
  }
  throw new Error(`missing module, tried ${relatives.join(", ")}`);
}

const { repairShortlistTables, hasClonedShortlistCells } = await import(
  resolveLocal(["./lib/shortlist-table.mjs", "../lib/shortlist-table.mjs"])
);
const { hasOrphanShortlistAnchor, hasPipelineHtmlComment } = await import(
  resolveLocal(["./lib/site-engine/index.mjs", "../lib/site-engine/index.mjs"])
);

const ROOT = process.cwd();
const POSTS = path.join(ROOT, "content", "posts");

function listSlugs() {
  if (!fs.existsSync(POSTS)) return [];
  return fs
    .readdirSync(POSTS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function repairLocale(slug, locale) {
  const filePath = path.join(POSTS, slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;
  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  const before = parsed.content;
  const result = repairShortlistTables(before, locale, slug);
  if (!result.changed) {
    return { slug, locale, changed: false };
  }
  parsed.data.updatedAt = new Date().toISOString();
  fs.writeFileSync(
    filePath,
    matter.stringify(result.body.trim() + "\n", parsed.data),
    "utf8",
  );
  return {
    slug,
    locale,
    changed: true,
    tableChanged: result.tableChanged,
    stillCloned: hasClonedShortlistCells(result.body),
    stillComment: hasPipelineHtmlComment(result.body),
    stillAnchor: hasOrphanShortlistAnchor(result.body),
  };
}

const only = process.argv[2];
const slugs = only ? [only] : listSlugs();
const reports = [];
for (const slug of slugs) {
  for (const locale of ["ko", "en"]) {
    const report = repairLocale(slug, locale);
    if (report?.changed) reports.push(report);
  }
}

console.log(
  JSON.stringify(
    { changed: reports.length, reports },
    null,
    2,
  ),
);
