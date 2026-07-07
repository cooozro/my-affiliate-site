/**
 * Post-publish URL submission — Google Indexing API + IndexNow (Bing, Naver, global).
 * Complements sitemap/RSS; does not replace them.
 */

import {
  requestGoogleIndexing,
} from "../automation/google-indexing.mjs";
import { submitIndexNowAll } from "../automation/indexnow.mjs";

export const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";

/** Channels fired on every publish (for docs / admin UI). */
export const INDEX_SUBMISSION_CHANNELS = [
  "google-indexing",
  "indexnow-global",
  "indexnow-naver",
  "indexnow-bing",
];

/**
 * @param {string} slug
 * @param {string} [siteUrl]
 */
export function buildPostUrls(slug, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    en: `${base}/en/blog/${slug}`,
    ko: `${base}/ko/blog/${slug}`,
    sitemap: `${base}/sitemap.xml`,
    rssEn: `${base}/en/feed.xml`,
    rssKo: `${base}/ko/feed.xml`,
  };
}

/**
 * Submit EN/KO blog URLs to search engines (direct crawl/index signals).
 * @param {string} slug
 * @param {{ siteUrl?: string, includeSitemapInIndexNow?: boolean }} [options]
 */
export async function submitPublishedPost(slug, options = {}) {
  const siteUrl = options.siteUrl ?? DEFAULT_SITE_URL;
  const urls = buildPostUrls(slug, siteUrl);
  const postUrls = [urls.en, urls.ko];
  const indexNowUrls =
    options.includeSitemapInIndexNow === false
      ? postUrls
      : [...postUrls, urls.sitemap];

  const results = [];

  for (const url of postUrls) {
    try {
      const response = await requestGoogleIndexing(url);
      if (response?.skipped) {
        results.push({
          channel: "google-indexing",
          url,
          ok: false,
          skipped: true,
          error: "GOOGLE_SERVICE_ACCOUNT_JSON not set",
        });
      } else {
        console.log(`Google Indexing API: ${url}`);
        results.push({ channel: "google-indexing", url, ok: true });
      }
    } catch (error) {
      console.warn(`Google Indexing API failed for ${url}: ${error.message}`);
      results.push({
        channel: "google-indexing",
        url,
        ok: false,
        error: error.message,
      });
    }
  }

  const indexNowResults = await submitIndexNowAll(indexNowUrls, { siteUrl });
  results.push(...indexNowResults);

  const okCount = results.filter((r) => r.ok).length;
  console.log(
    `Index submission for ${slug}: ${okCount}/${results.length} channel(s) ok`,
  );

  return { slug, urls, results, okCount, total: results.length };
}

/**
 * Warm sitemap/RSS after deploy so aggregators pick up new items.
 * @param {string} [siteUrl]
 */
export async function warmFeedAndSitemap(siteUrl = DEFAULT_SITE_URL) {
  const urls = buildPostUrls("_", siteUrl);
  const targets = [
    { url: urls.sitemap, label: "sitemap" },
    { url: urls.rssEn, label: "rss-en" },
    { url: urls.rssKo, label: "rss-ko" },
  ];

  const results = [];
  for (const target of targets) {
    try {
      const response = await fetch(target.url, {
        headers: { "User-Agent": "AI-Pick-IndexSubmission/1.0" },
      });
      console.log(`Warm ${target.label}: ${response.status} ${target.url}`);
      results.push({
        channel: target.label,
        url: target.url,
        ok: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        channel: target.label,
        url: target.url,
        ok: false,
        error: error.message,
      });
    }
  }
  return results;
}
