#!/usr/bin/env node
/** Unique cover for Midea — must differ from admin-uploaded guide hero (content hash). */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import crypto from "crypto";
import { ensureImageApiEnv } from "./lib/image-api-env.mjs";
import { stripCoverDuplicatesFromBody } from "./lib/draft-image-integrity.mjs";
import { repairModelDeepDiveBody } from "./lib/repair-model-deep-dive-body.mjs";
import {
  assetKey,
  isImageUsed,
  loadImageRegistry,
  registerUsedImage,
  saveImageRegistry,
} from "./lib/used-images.mjs";

const root = process.cwd();
const slug = "2026-dehumidifiers-midea-mad50c1-review";
const postsDir = path.join(root, "content", "posts", slug);

ensureImageApiEnv();
const pexelsKey = process.env.PEXELS_API_KEY?.trim();
if (!pexelsKey) {
  console.error("NO_PEXELS_KEY");
  process.exit(1);
}

const bannedHashes = new Set();
for (const otherSlug of fs.readdirSync(path.join(root, "content/posts"))) {
  if (!otherSlug.includes("dehumidifier") || otherSlug === slug) continue;
  const dir = path.join(root, "public/images/posts", otherSlug);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (!/\.(jpe?g|webp|png)$/i.test(name)) continue;
    bannedHashes.add(crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex"));
  }
}

const registry = loadImageRegistry();
const queries = [
  "portable white appliance bedroom",
  "basement laundry appliance",
  "humidity condensation window room",
  "home appliance product white background",
];

let picked = null;
for (const query of queries) {
  if (picked) break;
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "25");
  url.searchParams.set("orientation", "landscape");
  const data = await (await fetch(url, { headers: { Authorization: pexelsKey } })).json();
  for (const photo of data.photos ?? []) {
    const imageUrl = photo.src?.large2x || photo.src?.large;
    if (!imageUrl) continue;
    const key = assetKey("pexels", photo.id);
    if (isImageUsed(registry, { assetKey: key, url: imageUrl })) continue;
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) continue;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    if (bannedHashes.has(hash)) continue;
    const alt = String(photo.alt ?? "indoor appliance product photo").slice(0, 180);
    const filename = "midea-dehumidifier-unique-cover.jpg";
    const destDir = path.join(root, "public/images/posts", slug);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, filename), buffer);
    picked = {
      coverImage: `/images/posts/${slug}/${filename}`,
      coverImageAlt: alt.includes("dehumidifier") ? alt : `${alt} — dehumidifier review context`,
      coverImageAltKo: "실내 제습기 사용 환경 제품 컷",
      coverImageCredit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
      coverImageProvider: "pexels",
      coverImageAssetId: photo.id,
      coverImageSourceUrl: imageUrl.split("?")[0],
      hash,
      key,
      imageUrl,
      query,
    };
    break;
  }
}

if (!picked) {
  console.error("NO_UNIQUE_PEXELS_HIT");
  process.exit(1);
}

function readLocale(locale) {
  const { data, content } = matter(fs.readFileSync(path.join(postsDir, `${locale}.md`), "utf8"));
  return { data, content: content.trim() };
}

function writeLocale(locale, data, content) {
  fs.writeFileSync(
    path.join(postsDir, `${locale}.md`),
    matter.stringify(content, data),
    "utf8",
  );
}

for (const locale of ["en", "ko"]) {
  const post = readLocale(locale);
  const merged = {
    ...post.data,
    coverImage: picked.coverImage,
    coverImageProvider: picked.coverImageProvider,
    coverImageAssetId: picked.coverImageAssetId,
    coverImageSourceUrl: picked.coverImageSourceUrl,
    coverImageCredit: picked.coverImageCredit,
    coverImageAlt: locale === "ko" ? picked.coverImageAltKo : picked.coverImageAlt,
    coverImageAltKo: picked.coverImageAltKo,
  };
  let body = stripCoverDuplicatesFromBody(post.content, merged.coverImage).body;
  body = repairModelDeepDiveBody(merged, body, locale, { root }).body;
  writeLocale(locale, merged, body);
}

registerUsedImage(registry, {
  slug,
  provider: "pexels",
  assetKey: picked.key,
  url: picked.imageUrl.split("?")[0].toLowerCase(),
  hash: picked.hash,
  contentHash: picked.hash,
});
saveImageRegistry(registry);

console.log("COVER_OK", picked.coverImage, "query=", picked.query);
