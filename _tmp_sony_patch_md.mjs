#!/usr/bin/env node
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { writePost } from "./scripts/automation/posts-fs.mjs";

const siteRoot = "/opt/aipick";
process.chdir(siteRoot);
const slug = "2026-bluetooth-speakers-sony-xg500-review";
const saved = JSON.parse(fs.readFileSync("/tmp/sony_saved.json", "utf8"));
if (!saved.length) process.exit(2);

const credit =
  "Sony SRS-XG500 product photo (official product / editorial review asset)";
const shared = {
  coverImage: saved[0].path,
  coverImageAlt:
    "Sony SRS-XG500 portable party Bluetooth speaker — product photo for editorial review",
  coverImageAltKo:
    "Sony 소니 SRS-XG500 포터블 파티 블루투스 스피커 — 편집부 리뷰용 제품 컷",
  coverImageCredit: credit,
  coverImageProvider: "press-kit",
  coverImageSourceUrl: saved[0].sourceUrl,
  pressKitGallery: "https://electronics.sony.com/",
  updatedAt: new Date().toISOString(),
};

function stripFigures(html) {
  return String(html || "")
    .replace(/<figure[\s\S]*?<\/figure>\s*/gi, "")
    .replace(/!\[[^\]]*\]\([^)]+\)\s*/g, "");
}
function injectAfterH2(html, figures) {
  let out = stripFigures(html);
  let i = 0;
  return out.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, (m) => {
    if (i >= figures.length) return m;
    const fig = figures[i++];
    return `${m}\n<figure class="aipick-figure"><img src="${fig.path}" alt="${fig.alt}" loading="lazy" style="max-width:100%;height:auto;" /><figcaption>${fig.credit}</figcaption></figure>\n`;
  });
}

const figures = saved.slice(1).map((b, idx) => ({
  path: b.path,
  alt:
    idx === 0
      ? "Sony SRS-XG500 product view — editorial review figure"
      : "Sony SRS-XG500 detail — editorial review figure",
  credit,
}));

const enPath = path.join(siteRoot, "content/posts", slug, "en.md");
const koPath = path.join(siteRoot, "content/posts", slug, "ko.md");
const en = matter(fs.readFileSync(enPath, "utf8"));
const ko = matter(fs.readFileSync(koPath, "utf8"));
writePost(slug, "en", { ...en.data, ...shared }, injectAfterH2(en.content, figures));
writePost(
  slug,
  "ko",
  { ...ko.data, ...shared, coverImageAlt: shared.coverImageAltKo },
  injectAfterH2(ko.content, figures),
);
console.log("patched", shared.coverImage, figures.map((f) => f.path));
