import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  buildCoverAlt,
  buildCoverFilename,
  resolveImageContext,
  scoreImageRelevance,
} from "./image-query.mjs";
import {
  assetKey,
  hashBuffer,
  isImageUsed,
  loadImageRegistry,
  registerUsedImage,
  saveImageRegistry,
  syncImageRegistryFromPosts,
} from "./used-images.mjs";

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

function searchPage(slug, queryIndex, pageOffset = 0) {
  return (hashSlug(slug, `page:${queryIndex}:${pageOffset}`) % 4) + 1 + pageOffset;
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

function orderedViableCandidates(ranked, slug, minScore) {
  const viable = ranked.filter((c) => c.score >= minScore);
  const pool = viable.length > 0 ? viable : ranked;
  if (pool.length === 0) return [];

  const top = pool.slice(0, Math.min(12, pool.length));
  const start = hashSlug(slug, "pick") % top.length;
  return [...top.slice(start), ...top.slice(0, start)];
}

async function downloadToSlug(slug, imageUrl, filename) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Image download failed: ${imageResponse.status}`);
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const relativePath = `/images/posts/${slug}/${filename}`;
  const destPath = path.join(process.cwd(), "public", "images", "posts", slug, filename);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);

  return { relativePath, buffer, hash: hashBuffer(buffer) };
}

function candidateIsUsed(registry, candidate) {
  return isImageUsed(registry, {
    url: candidate.imageUrl,
    assetKey: candidate.assetKey,
  });
}

async function pickUnusedCandidate(candidates, slug, registry, minScore) {
  const ranked = rankCandidates(candidates, { productKeywords: [], negativeTags: [] });
  const ordered = orderedViableCandidates(ranked, slug, minScore);

  for (const candidate of ordered) {
    if (!candidateIsUsed(registry, candidate)) {
      return candidate;
    }
  }

  return null;
}

async function searchPexels(query, apiKey, slug, queryIndex, ctx, registry, pageOffset = 0) {
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex, pageOffset)));
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
        assetKey: assetKey("pexels", photo.id),
        relevanceText: `${photo.alt ?? ""} ${query}`,
        credit: `Photo by ${photo.photographer ?? "Pexels"} / Pexels`,
        provider: "pexels",
        assetId: photo.id,
      };
    })
    .filter(Boolean);

  const ranked = rankCandidates(candidates, ctx);
  const ordered = orderedViableCandidates(ranked, slug, 2);
  if (ordered.length === 0) {
    return orderedViableCandidates(ranked, slug, 0);
  }
  return ordered;
}

async function searchPixabay(query, apiKey, slug, queryIndex, ctx, registry, pageOffset = 0) {
  const url = new URL(PIXABAY_SEARCH);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", "30");
  url.searchParams.set("page", String(searchPage(slug, queryIndex, pageOffset)));
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
        assetKey: assetKey("pixabay", hit.id),
        relevanceText: `${hit.tags ?? ""} ${query}`,
        credit: `Photo by ${user} / Pixabay`,
        provider: "pixabay",
        assetId: hit.id,
      };
    })
    .filter(Boolean);

  const ranked = rankCandidates(candidates, ctx);
  const ordered = orderedViableCandidates(ranked, slug, 2);
  if (ordered.length === 0) {
    return orderedViableCandidates(ranked, slug, 0);
  }
  return ordered;
}

function pickFirstUnused(ordered, registry) {
  for (const candidate of ordered) {
    if (!candidateIsUsed(registry, candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Fetch a cover image using Pexels + Pixabay rotation (slug-stable).
 * Never reuses a provider asset id, source url, or file hash already in the registry.
 */
export async function fetchCoverImage(slug, queryOrContext, options = {}) {
  const ctx = resolveImageContext(slug, queryOrContext);
  const order = providerOrder(slug, options.provider);
  let registry = syncImageRegistryFromPosts();

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

    for (const pageOffset of [0, 1, 2]) {
      for (const provider of order) {
        try {
          let ordered = [];

          if (provider === "pexels") {
            ordered =
              (await searchPexels(
                query,
                process.env.PEXELS_API_KEY.trim(),
                slug,
                queryIndex,
                ctx,
                registry,
                pageOffset,
              )) ?? [];
          } else if (provider === "pixabay") {
            ordered =
              (await searchPixabay(
                query,
                process.env.PIXABAY_API_KEY.trim(),
                slug,
                queryIndex,
                ctx,
                registry,
                pageOffset,
              )) ?? [];
          }

          const result = pickFirstUnused(ordered, registry);
          if (!result) {
            console.warn(
              `${provider}: all results already used for "${query}" (page+${pageOffset})`,
            );
            continue;
          }

          const downloaded = await downloadToSlug(slug, result.imageUrl, filename);
          if (isImageUsed(registry, { hash: downloaded.hash })) {
            console.warn(
              `${provider}: downloaded bytes match an existing cover — trying next candidate`,
            );
            fs.unlinkSync(
              path.join(process.cwd(), "public", downloaded.relativePath.replace(/^\//, "")),
            );
            registerUsedImage(registry, {
              slug,
              url: result.imageUrl,
              assetKey: result.assetKey,
              hash: downloaded.hash,
              provider: result.provider,
            });
            saveImageRegistry(registry);
            continue;
          }

          registerUsedImage(registry, {
            slug,
            url: result.imageUrl,
            assetKey: result.assetKey,
            hash: downloaded.hash,
            provider: result.provider,
          });
          saveImageRegistry(registry);

          console.log(
            `Cover image: ${slug} via ${result.provider} id=${result.assetId} (query="${query}")`,
          );

          return {
            coverImage: downloaded.relativePath,
            coverImageAlt,
            coverImageAltKo,
            coverImageCredit: result.credit,
            coverImageProvider: result.provider,
            coverImageAssetId: result.assetId,
            coverImageSourceUrl: result.imageUrl,
          };
        } catch (error) {
          lastError = error;
          console.warn(`${provider} failed for ${slug}: ${error.message}`);
        }
      }
    }
  }

  if (lastError) {
    console.warn(`All image providers failed for ${slug}: ${lastError.message}`);
  }

  return null;
}
