import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  buildCoverAlt,
  buildCoverFilename,
  resolveImageContext,
  scoreImageRelevance,
} from "./image-query.mjs";

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

function searchPage(slug, queryIndex) {
  return (hashSlug(slug, `page:${queryIndex}`) % 4) + 1;
}

function rankCandidates(candidates, ctx) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreImageRelevance(
        candidate.relevanceText,
        ctx.productKeywords,
        ctx.negativeTags,
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

function pickFromRanked(ranked, slug, minScore) {
  const viable = ranked.filter((c) => c.score >= minScore);
  if (viable.length === 0) return null;

  const top = viable.slice(0, Math.min(5, viable.length));
  const idx = hashSlug(slug, "pick") % top.length;
  return top[idx];
}

async function downloadToSlug(slug, imageUrl, filename) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const relativePath = `/images/posts/${slug}/${filename}`;
  const destPath = path.join(process.cwd(), "public", "images", "posts", slug, filename);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, Buffer.from(await imageResponse.arrayBuffer()));

  return relativePath;
}

async function searchPexels(query, apiKey, slug, queryIndex, ctx) {
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", String(searchPage(slug, queryIndex)));
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

  const candidates = photos
    .map((photo) => {
      const imageUrl = photo.src?.large2x || photo.src?.large;
      if (!imageUrl) return null;

      return {
        imageUrl,
        relevanceText: `${photo.alt ?? ""} ${query}`,
        credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
        provider: "pexels",
      };
    })
    .filter(Boolean);

  const ranked = rankCandidates(candidates, ctx);
  return pickFromRanked(ranked, slug, 2) ?? pickFromRanked(ranked, slug, 0);
}

async function searchPixabay(query, apiKey, slug, queryIndex, ctx) {
  const url = new URL(PIXABAY_SEARCH);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex)));
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pixabay API ${response.status}`);
  }

  const data = await response.json();
  const hits = data.hits ?? [];
  if (hits.length === 0) return null;

  const candidates = hits
    .map((hit) => {
      const imageUrl = hit.largeImageURL || hit.webformatURL;
      if (!imageUrl) return null;

      const user = hit.user ?? "Pixabay";
      return {
        imageUrl,
        relevanceText: `${hit.tags ?? ""} ${query}`,
        credit: `Photo by ${user} / Pixabay`,
        provider: "pixabay",
      };
    })
    .filter(Boolean);

  const ranked = rankCandidates(candidates, ctx);
  return pickFromRanked(ranked, slug, 2) ?? pickFromRanked(ranked, slug, 0);
}

/**
 * Fetch a cover image using Pexels + Pixabay rotation (slug-stable).
 * @param {string} slug
 * @param {string | Record<string, unknown>} queryOrContext - legacy query string or post metadata
 * @param {{ provider?: 'pexels' | 'pixabay' }} [options]
 */
export async function fetchCoverImage(slug, queryOrContext, options = {}) {
  const ctx = resolveImageContext(slug, queryOrContext);
  const order = providerOrder(slug, options.provider);

  if (order.length === 0) {
    console.warn(
      "No image API keys set — add PEXELS_API_KEY and/or PIXABAY_API_KEY",
    );
    return null;
  }

  let lastError = null;
  const filename = buildCoverFilename(ctx.productKeywords, slug);
  const coverImageAlt = buildCoverAlt("en", ctx);
  const coverImageAltKo = buildCoverAlt("ko", ctx);

  for (let queryIndex = 0; queryIndex < ctx.searchQueries.length; queryIndex++) {
    const query = ctx.searchQueries[queryIndex];

    for (const provider of order) {
      try {
        let result = null;

        if (provider === "pexels") {
          result = await searchPexels(
            query,
            process.env.PEXELS_API_KEY.trim(),
            slug,
            queryIndex,
            ctx,
          );
        } else if (provider === "pixabay") {
          result = await searchPixabay(
            query,
            process.env.PIXABAY_API_KEY.trim(),
            slug,
            queryIndex,
            ctx,
          );
        }

        if (!result) {
          console.warn(`${provider}: no relevant results for "${query}"`);
          continue;
        }

        const coverImage = await downloadToSlug(slug, result.imageUrl, filename);
        console.log(
          `Cover image: ${slug} via ${result.provider} (query="${query}", keywords="${ctx.productKeywords.join(", ")}")`,
        );

        return {
          coverImage,
          coverImageAlt,
          coverImageAltKo,
          coverImageCredit: result.credit,
          coverImageProvider: result.provider,
        };
      } catch (error) {
        lastError = error;
        console.warn(`${provider} failed for ${slug}: ${error.message}`);
      }
    }
  }

  if (lastError) {
    console.warn(`All image providers failed for ${slug}: ${lastError.message}`);
  }

  return null;
}
