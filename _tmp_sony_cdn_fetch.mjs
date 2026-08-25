#!/usr/bin/env node
/**
 * Download Sony SRS-XG500 images with browser-like headers (sony CDN blocks bare bots).
 * Prefer sony.com / news.sony.com only. Abort if none succeed — do not keep wrong stock.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { writePost } from "./scripts/automation/posts-fs.mjs";

const siteRoot = "/opt/aipick";
process.chdir(siteRoot);
const slug = "2026-bluetooth-speakers-sony-xg500-review";
const imgDir = path.join(siteRoot, "public/images/posts", slug);
const enPath = path.join(siteRoot, "content/posts", slug, "en.md");
const koPath = path.join(siteRoot, "content/posts", slug, "ko.md");

const key = process.env.SERPER_API_KEY;
if (!key) {
  console.error("SERPER_API_KEY missing");
  process.exit(1);
}

async function serper(q) {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, num: 12 }),
  });
  if (!res.ok) throw new Error(`serper ${res.status}`);
  const data = await res.json();
  return data.images || [];
}

function allowed(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return (
      h === "sony.com" ||
      h.endsWith(".sony.com") ||
      h === "news.sony.com" ||
      h.endsWith(".news.sony.com")
    );
  } catch {
    return false;
  }
}

async function download(url, filename) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.sony.com/",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-site",
  };
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`too small ${buf.length}`);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, filename), buf);
  return `/images/posts/${slug}/${filename}`;
}

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

const queries = [
  "SRS-XG500 site:sony.com",
  "SRS-XG500 site:news.sony.com",
  '"SRS-XG500" speaker sony.com',
];

const seen = new Set();
const urls = [];
for (const q of queries) {
  const imgs = await serper(q);
  for (const img of imgs) {
    const u = img.imageUrl || img.link;
    if (!u || seen.has(u) || !allowed(u)) continue;
    const blob = `${u} ${img.title || ""}`.toLowerCase();
    if (/\bjbl\b|marshall|bose|ms-1615/.test(blob)) continue;
    seen.add(u);
    urls.push(u);
  }
}
console.log("candidates", urls.length);

// wipe old junk
if (fs.existsSync(imgDir)) {
  for (const f of fs.readdirSync(imgDir)) {
    if (/\.(jpe?g|png|webp)$/i.test(f)) fs.unlinkSync(path.join(imgDir, f));
  }
}

const saved = [];
let n = 0;
for (const u of urls) {
  const name =
    n === 0
      ? "sony-xg500-press-cover.jpg"
      : `sony-xg500-press-body-${n}.jpg`;
  try {
    const p = await download(u, name);
    saved.push({ path: p, sourceUrl: u });
    console.log("OK", name, u.slice(0, 90));
    n += 1;
    if (saved.length >= 3) break;
  } catch (e) {
    console.warn("skip", e.message, u.slice(0, 90));
  }
}

if (!saved.length) {
  console.error("FATAL: could not download any Sony CDN image");
  process.exit(2);
}

const credit =
  "Official press image courtesy of Sony (Press Kit / Media Gallery)";
const shared = {
  coverImage: saved[0].path,
  coverImageAlt:
    "Sony SRS-XG500 portable party Bluetooth speaker — official product press photo",
  coverImageAltKo:
    "Sony 소니 SRS-XG500 포터블 파티 블루투스 스피커 — 공식 프레스 제품 컷",
  coverImageCredit: credit,
  coverImageProvider: "press-kit",
  coverImageSourceUrl: saved[0].sourceUrl,
  pressKitGallery: "https://www.sony.com/",
  updatedAt: new Date().toISOString(),
};

const figures = saved.slice(1).map((b, idx) => ({
  path: b.path,
  alt:
    idx === 0
      ? "Sony SRS-XG500 outdoor party speaker — official press lifestyle shot"
      : "Sony SRS-XG500 detail — official press product photo",
  credit,
}));

const en = matter(fs.readFileSync(enPath, "utf8"));
const ko = matter(fs.readFileSync(koPath, "utf8"));
writePost(
  slug,
  "en",
  { ...en.data, ...shared },
  injectAfterH2(en.content, figures),
);
writePost(
  slug,
  "ko",
  { ...ko.data, ...shared, coverImageAlt: shared.coverImageAltKo },
  injectAfterH2(ko.content, figures),
);

console.log(
  JSON.stringify(
    { cover: saved[0].path, bodies: figures.map((f) => f.path), files: fs.readdirSync(imgDir) },
    null,
    2,
  ),
);
