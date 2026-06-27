import fs from "fs";
import path from "path";
import crypto from "crypto";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const PIXABAY_SEARCH = "https://pixabay.com/api/";

/** Stable numeric hash from slug (provider pick + result offset). */
export function hashSlug(slug, salt = "") {
  const hex = crypto.createHash("sha256").update(`${slug}:${salt}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16);
}

export function availableImageProviders() {
  const providers = [];
  if (process.env.PEXELS_API_KEY?.trim()) providers.push("pexels");
  if (process.env.PIXABAY_API_KEY?.trim()) providers.push("pixabay");
  return providers;
}

/**
 * Rotate primary provider by slug so posts split across Pexels / Pixabay.
 */
export function pickImageProvider(slug) {
  const providers = availableImageProviders();
  if (providers.length === 0) return null;
  if (providers.length === 1) return providers[0];
  const idx = hashSlug(slug, "provider") % providers.length;
  return providers[idx];
}

function providerOrder(slug, forced) {
  const available = availableImageProviders();
  if (available.length === 0) return [];

  if (forced && available.includes(forced)) {
    return [forced, ...available.filter((p) => p !== forced)];
  }

  const primary = pickImageProvider(slug);
  if (!primary) return available;
  return [primary, ...available.filter((p) => p !== primary)];
}

function searchPage(slug) {
  return (hashSlug(slug, "page") % 4) + 1;
}

function pickIndex(slug, count) {
  if (count <= 0) return 0;
  return hashSlug(slug, "index") % count;
}

async function downloadToSlug(slug, imageUrl) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const relativePath = `/images/posts/${slug}/cover.jpg`;
  const destPath = path.join(process.cwd(), "public", "images", "posts", slug, "cover.jpg");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await imageResponse.arrayBuffer()));

  return relativePath;
}

async function searchPexels(query, apiKey, slug) {
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "15");
  url.searchParams.set("page", String(searchPage(slug)));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    throw new Error(`Pexels API ${response.status}`);
  }

  const data = await response.json();
  const photos = data.photos ?? [];
  if (photos.length === 0) return null;

  const photo = photos[pickIndex(slug, photos.length)];
  const imageUrl = photo.src?.large2x || photo.src?.large;
  if (!imageUrl) return null;

  return {
    imageUrl,
    alt: query,
    credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
    provider: "pexels",
  };
}

async function searchPixabay(query, apiKey, slug) {
  const url = new URL(PIXABAY_SEARCH);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", String(searchPage(slug)));
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pixabay API ${response.status}`);
  }

  const data = await response.json();
  const hits = data.hits ?? [];
  if (hits.length === 0) return null;

  const hit = hits[pickIndex(slug, hits.length)];
  const imageUrl = hit.largeImageURL || hit.webformatURL;
  if (!imageUrl) return null;

  const user = hit.user ?? "Pixabay";
  return {
    imageUrl,
    alt: query,
    credit: `Photo by ${user} / Pixabay`,
    provider: "pixabay",
  };
}

/**
 * Fetch a cover image using Pexels + Pixabay rotation (slug-stable).
 * @param {string} slug
 * @param {string} query
 * @param {{ provider?: 'pexels' | 'pixabay' }} [options]
 */
export async function fetchCoverImage(slug, query, options = {}) {
  const order = providerOrder(slug, options.provider);

  if (order.length === 0) {
    console.warn(
      "No image API keys set — add PEXELS_API_KEY and/or PIXABAY_API_KEY",
    );
    return null;
  }

  let lastError = null;

  for (const provider of order) {
    try {
      let result = null;

      if (provider === "pexels") {
        result = await searchPexels(query, process.env.PEXELS_API_KEY.trim(), slug);
      } else if (provider === "pixabay") {
        result = await searchPixabay(query, process.env.PIXABAY_API_KEY.trim(), slug);
      }

      if (!result) {
        console.warn(`${provider}: no results for "${query}"`);
        continue;
      }

      const coverImage = await downloadToSlug(slug, result.imageUrl);
      console.log(`Cover image: ${slug} via ${result.provider} (query="${query}")`);

      return {
        coverImage,
        coverImageAlt: result.alt,
        coverImageCredit: result.credit,
        coverImageProvider: result.provider,
      };
    } catch (error) {
      lastError = error;
      console.warn(`${provider} failed for ${slug}: ${error.message}`);
    }
  }

  if (lastError) {
    console.warn(`All image providers failed for ${slug}: ${lastError.message}`);
  }

  return null;
}
