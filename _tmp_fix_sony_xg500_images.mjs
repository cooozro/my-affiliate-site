#!/usr/bin/env node
/**
 * Force unique Sony SRS-XG500-ish cover+body images (Pexels), purge orphan body-* files,
 * rewrite en.md/ko.md frontmatter + inject figures.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const siteRoot = process.env.AIPICK_SITE_ROOT || "/opt/aipick";
process.chdir(siteRoot);

const slug = "2026-bluetooth-speakers-sony-xg500-review";
const imgDir = path.join(siteRoot, "public/images/posts", slug);
const enPath = path.join(siteRoot, "content/posts", slug, "en.md");
const koPath = path.join(siteRoot, "content/posts", slug, "ko.md");

const PEXELS_KEY =
  process.env.PEXELS_API_KEY ||
  process.env.PEXELS_ACCESS_KEY ||
  (fs.existsSync(path.join(siteRoot, "secrets/pexels_access_key.txt"))
    ? fs.readFileSync(path.join(siteRoot, "secrets/pexels_access_key.txt"), "utf8").trim()
    : "");

if (!PEXELS_KEY) {
  console.error("missing PEXELS key");
  process.exit(1);
}

async function search(q, perPage = 15) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const data = await res.json();
  return data.photos || [];
}

async function download(photo, filename) {
  const src =
    photo?.src?.large2x || photo?.src?.large || photo?.src?.medium || photo?.src?.original;
  if (!src) throw new Error("no src");
  const res = await fetch(src);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(imgDir, { recursive: true });
  const dest = path.join(imgDir, filename);
  fs.writeFileSync(dest, buf);
  return {
    path: `/images/posts/${slug}/${filename}`,
    credit: `Photo by ${photo.photographer || "Pexels"} / Pexels`,
    assetId: photo.id,
    sourceUrl: String(src).split("?")[0],
  };
}

function stripFigures(html) {
  return html
    .replace(/<figure[\s\S]*?<\/figure>\s*/gi, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)\s*/g, "");
}

function injectAfterH2(html, figures) {
  let out = stripFigures(html);
  let i = 0;
  out = out.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi, (m) => {
    if (i >= figures.length) return m;
    const fig = figures[i++];
    return `${m}\n<figure class="aipick-figure"><img src="${fig.path}" alt="${fig.alt}" loading="lazy" style="max-width:100%;height:auto;" /><figcaption>${fig.credit}</figcaption></figure>\n`;
  });
  return out;
}

const queries = [
  "sony bluetooth speaker outdoor party",
  "large portable bluetooth boombox speaker",
  "wireless party speaker outdoor summer",
  "portable speaker IPX waterproof outdoor",
];

const used = new Set();
const picks = [];
for (const q of queries) {
  const photos = await search(q, 20);
  for (const p of photos) {
    if (used.has(p.id)) continue;
    // Prefer rectangular large speakers; skip earbuds/headphones by alt heuristics
    const alt = `${p.alt || ""} ${p.url || ""}`.toLowerCase();
    if (/earbud|headphone|earphone|marshall|jbl flip|airpod/.test(alt)) continue;
    used.add(p.id);
    picks.push(p);
    if (picks.length >= 3) break;
  }
  if (picks.length >= 3) break;
}
if (picks.length < 1) {
  console.error("no photos");
  process.exit(1);
}

// purge old images
for (const f of fs.readdirSync(imgDir)) {
  if (/\.(jpg|jpeg|png|webp)$/i.test(f)) fs.unlinkSync(path.join(imgDir, f));
}

const cover = await download(picks[0], "sony-xg500-cover.jpg");
const body1 = await download(picks[1] || picks[0], "sony-xg500-body-1.jpg");
const body2 = await download(picks[2] || picks[0], "sony-xg500-body-2.jpg");

const en = matter(fs.readFileSync(enPath, "utf8"));
const ko = matter(fs.readFileSync(koPath, "utf8"));

const shared = {
  coverImage: cover.path,
  coverImageAlt:
    "Sony SRS-XG500-style portable party Bluetooth speaker outdoors — editorial review illustration",
  coverImageAltKo:
    "Sony SRS-XG500 스타일 야외 파티 블루투스 스피커 — 편집부 리뷰용 일러스트",
  coverImageCredit: cover.credit,
  coverImageProvider: "pexels",
  coverImageAssetId: cover.assetId,
  coverImageSourceUrl: cover.sourceUrl,
  updatedAt: new Date().toISOString(),
};

const figures = [
  {
    path: body1.path,
    alt: "Large portable Bluetooth party speaker outdoors — Sony SRS-XG500 review context",
    credit: body1.credit,
  },
  {
    path: body2.path,
    alt: "Wireless boombox speaker detail for outdoor use — XG500 style product context",
    credit: body2.credit,
  },
];

en.data = { ...en.data, ...shared };
ko.data = {
  ...ko.data,
  ...shared,
  coverImageAlt: shared.coverImageAltKo,
};

en.content = injectAfterH2(en.content, figures);
ko.content = injectAfterH2(ko.content, figures);

fs.writeFileSync(enPath, matter.stringify(en.content, en.data));
fs.writeFileSync(koPath, matter.stringify(ko.content, ko.data));
console.log(JSON.stringify({ cover: cover.path, body: [body1.path, body2.path], files: fs.readdirSync(imgDir) }, null, 2));
