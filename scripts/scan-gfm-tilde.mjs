#!/usr/bin/env node
/**
 * Scan all post bodies for GFM tilde/strikethrough risk and optionally repair.
 * Usage: node scripts/scan-gfm-tilde.mjs [--repair]
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderToStaticMarkup } from "react-dom/server";
import {
  findRiskyGfmTildeLines,
  repairGfmTildeRanges,
} from "./lib/guardian/markdown-gfm-safe.mjs";

const ROOT = process.cwd();
const POSTS = path.join(ROOT, "content", "posts");
const repair = process.argv.includes("--repair");

function hasDel(html) {
  return html.includes("<del>");
}

function paragraphStrikeRisk(text) {
  if (!text.includes("~")) return false;
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, text),
  );
  return hasDel(html);
}

const hits = [];

for (const slug of fs.readdirSync(POSTS)) {
  const dir = path.join(POSTS, slug);
  if (!fs.statSync(dir).isDirectory()) continue;

  for (const locale of ["en", "ko"]) {
    const file = path.join(dir, `${locale}.md`);
    if (!fs.existsSync(file)) continue;

    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    const riskyLines = findRiskyGfmTildeLines(content);

    let strikeParagraphs = 0;
    for (const block of content.split(/\n\n+/)) {
      if (block.includes("~") && paragraphStrikeRisk(block.trim())) {
        strikeParagraphs += 1;
      }
    }

    if (strikeParagraphs > 0 || riskyLines.length > 0) {
      hits.push({ slug, locale, strikeParagraphs, riskyLines: riskyLines.length, draft: data.draft });
    }

    if (repair) {
      const { text, changed, count } = repairGfmTildeRanges(content);
      if (changed) {
        fs.writeFileSync(file, matter.stringify(text, data));
        console.log(`Repaired ${slug}/${locale}.md (${count} tilde ranges)`);
      }
    }
  }
}

console.log("\n=== GFM tilde scan ===\n");
if (hits.length === 0) {
  console.log("No risky posts found.");
} else {
  for (const h of hits) {
    console.log(
      `${h.slug} (${h.locale})${h.draft ? " [draft]" : ""}: ` +
        `${h.strikeParagraphs} paragraph(s) with <del>, ${h.riskyLines} risky line(s)`,
    );
  }
}

process.exit(0);
