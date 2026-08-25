#!/usr/bin/env node
/**
 * Force Sony SRS-XG500 press-kit images only (no Pexels stock fallback).
 * Rejects non-allowlisted hosts and brand-mismatched stock.
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { ensureImageApiEnv } from "./scripts/lib/image-api-env.mjs";
import {
  fetchPressKitImages,
  resolvePressKitEntry,
  isPressKitUrlAllowed,
  buildPressKitCredit,
} from "./scripts/lib/press-kit-images.mjs";
import { writePost } from "./scripts/automation/posts-fs.mjs";

ensureImageApiEnv();

const siteRoot = process.env.AIPICK_SITE_ROOT || "/opt/aipick";
process.chdir(siteRoot);

const slug = "2026-bluetooth-speakers-sony-xg500-review";
const model = {
  id: "sony-xg500",
  brand: "Sony",
  name: "SRS-XG500",
  nameKo: "소니 SRS-XG500",
};

const imgDir = path.join(siteRoot, "public/images/posts", slug);
const enPath = path.join(siteRoot, "content/posts", slug, "en.md");
const koPath = path.join(siteRoot, "content/posts", slug, "ko.md");

function stripFigures(html) {
  return String(html || "")
    .replace(/<figure[\s\S]*?<\/figure>\s*/gi, "")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)\s*/g, "");
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

async function serperDiscover(count = 6) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY missing");
  const queries = [
    'SRS-XG500 site:sony.com',
    'SRS-XG500 site:news.sony.com',
    '"SRS-XG500" speaker site:sony.com filetype:jpg',
    'Sony XG500 portable speaker product press',
  ];
  const seen = new Set();
  const urls = [];
  for (const q of queries) {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, num: 10 }),
    });
    if (!res.ok) {
      console.warn("serper fail", res.status, q);
      continue;
    }
    const data = await res.json();
    for (const img of data.images || []) {
      const u = img.imageUrl || img.link || img.thumbnailUrl;
      if (!u || seen.has(u)) continue;
      if (!isPressKitUrlAllowed(u)) continue;
      const low = String(u + " " + (img.title || "")).toLowerCase();
      if (!/xg500|srs-xg500|xg-500/.test(low) && !/sony/.test(low)) continue;
      // hard reject other brands
      if (/\bjbl\b|marshall|bose|ms-1615|flip\s?\d/.test(low)) continue;
      seen.add(u);
      urls.push(u);
      if (urls.length >= count) break;
    }
    if (urls.length >= count) break;
  }
  return urls;
}

async function downloadUrl(url, filename) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "AIPickEditorialBot/1.0 (+https://www.aipick.shop; press-kit editorial fetch)",
      Accept: "image/*,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download ${res.status} ${url}`);
  const ct = String(res.headers.get("content-type") || "");
  if (ct && !ct.includes("image") && !ct.includes("octet")) {
    throw new Error(`not image ct=${ct}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error("too small");
  fs.mkdirSync(imgDir, { recursive: true });
  const dest = path.join(imgDir, filename);
  fs.writeFileSync(dest, buf);
  return `/images/posts/${slug}/${filename}`;
}

console.log("1) try press-kit module…");
let press = await fetchPressKitImages(slug, model, {
  count: 3,
  preferRoles: ["cover", "lifestyle", "detail"],
});
console.log("press images:", press.images?.length || 0, press.entry?.galleryUrl);

let paths = (press.images || []).map((p) => p.path).filter(Boolean);

if (paths.length < 2) {
  console.log("2) serper allowlisted Sony hosts…");
  const urls = await serperDiscover(8);
  console.log("candidate urls", urls.length, urls.slice(0, 5));
  // purge old junk first
  if (fs.existsSync(imgDir)) {
    for (const f of fs.readdirSync(imgDir)) {
      if (/\.(jpe?g|png|webp)$/i.test(f)) fs.unlinkSync(path.join(imgDir, f));
    }
  }
  paths = [];
  let i = 0;
  for (const u of urls) {
    try {
      const name =
        i === 0
          ? "sony-xg500-press-cover.jpg"
          : `sony-xg500-press-body-${i}.jpg`;
      const p = await downloadUrl(u, name);
      paths.push({ path: p, sourceUrl: u });
      i += 1;
      if (paths.length >= 3) break;
    } catch (e) {
      console.warn("skip", u, e.message);
    }
  }
} else {
  // already have press paths as strings from module
  paths = press.images.map((img) => ({
    path: img.path,
    sourceUrl: img.sourceUrl || img.url,
  }));
}

if (!paths.length) {
  console.error("FATAL: no Sony press images found — abort (will not keep wrong stock)");
  process.exit(2);
}

const entry = resolvePressKitEntry(model);
const credit = buildPressKitCredit(entry);
const coverPath = paths[0].path;
const bodyPaths = paths.slice(1);

const en = matter(fs.readFileSync(enPath, "utf8"));
const ko = matter(fs.readFileSync(koPath, "utf8"));

const shared = {
  coverImage: coverPath,
  coverImageAlt:
    "Sony SRS-XG500 portable party Bluetooth speaker — official product press photo",
  coverImageAltKo: "Sony 소니 SRS-XG500 포터블 파티 블루투스 스피커 — 공식 프레스 제품 컷",
  coverImageCredit: credit,
  coverImageProvider: "press-kit",
  coverImageSourceUrl: paths[0].sourceUrl || null,
  pressKitGallery: entry?.galleryUrl || "https://www.sony.com/",
  updatedAt: new Date().toISOString(),
};

const figures = bodyPaths.map((b, idx) => ({
  path: b.path,
  alt:
    idx === 0
      ? "Sony SRS-XG500 outdoor party speaker — official press lifestyle shot"
      : "Sony SRS-XG500 detail — official press product photo",
  credit,
}));

const enBody = injectAfterH2(en.content, figures);
const koBody = injectAfterH2(ko.content, figures);

writePost(slug, "en", { ...en.data, ...shared }, enBody);
writePost(slug, "ko", {
  ...ko.data,
  ...shared,
  coverImageAlt: shared.coverImageAltKo,
}, koBody);

console.log(
  JSON.stringify(
    {
      cover: coverPath,
      bodies: bodyPaths.map((b) => b.path),
      files: fs.readdirSync(imgDir),
    },
    null,
    2,
  ),
);
