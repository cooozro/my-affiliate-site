import fs from "fs";
import path from "path";
import { submitIndexNow } from "./indexnow.mjs";
import {
  requestGoogleIndexing,
  requestSitemapPing,
} from "./google-indexing.mjs";
import { readPost } from "./posts-fs.mjs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop";
const LOG_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "distribution-log.jsonl",
);
const SHARE_PACK_DIR = path.join(
  process.cwd(),
  "data",
  "automation",
  "share-packs",
);

function appendLog(entry) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}

function buildSharePack({ slug, urls, en, ko }) {
  const primary = en.data;
  const tags = (primary.tags ?? []).join(", ");
  const hook =
    primary.description?.trim() ||
    "Data-backed buying guide from AI Pick & Report.";

  return {
    slug,
    generatedAt: new Date().toISOString(),
    urls,
    en: {
      title: primary.title,
      url: urls.en,
      description: primary.description,
      tags: primary.tags ?? [],
    },
    ko: {
      title: ko.data.title,
      url: urls.ko,
      description: ko.data.description,
      tags: ko.data.tags ?? [],
    },
    manual: {
      x: `${primary.title}\n${hook}\n${urls.en}`,
      linkedin: `${primary.title} — ${hook}\n${urls.en}`,
      reddit: {
        title: primary.title,
        body: `${hook}\n\nFull guide: ${urls.en}\n\nTags: ${tags || "tech, buying guide"}`,
      },
    },
  };
}

function saveSharePack(slug, pack) {
  fs.mkdirSync(SHARE_PACK_DIR, { recursive: true });
  const filePath = path.join(SHARE_PACK_DIR, `${slug}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  return filePath;
}

async function pingGoogleUrls(urls) {
  const results = [];
  for (const url of urls) {
    try {
      await requestGoogleIndexing(url);
      console.log(`Indexing requested: ${url}`);
      results.push({ channel: "google-indexing", url, ok: true });
    } catch (error) {
      console.warn(`Indexing failed for ${url}: ${error.message}`);
      results.push({
        channel: "google-indexing",
        url,
        ok: false,
        error: error.message,
      });
    }
  }
  return results;
}

async function pingIndexNow(urls) {
  try {
    const result = await submitIndexNow(urls, { siteUrl: SITE_URL });
    return [{ channel: "indexnow", ok: true, ...result }];
  } catch (error) {
    console.warn(`IndexNow failed: ${error.message}`);
    return [{ channel: "indexnow", ok: false, error: error.message }];
  }
}

async function pingSitemap() {
  try {
    const status = await requestSitemapPing();
    return [{ channel: "google-sitemap-ping", ok: status === 200, status }];
  } catch (error) {
    console.warn(`Sitemap ping failed: ${error.message}`);
    return [
      { channel: "google-sitemap-ping", ok: false, error: error.message },
    ];
  }
}

async function warmUrl(url, label) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AI-Pick-Distributor/1.0" },
    });
    console.log(`Warm ${label}: ${response.status} ${url}`);
    return { channel: label, url, ok: response.ok, status: response.status };
  } catch (error) {
    console.warn(`Warm ${label} failed: ${error.message}`);
    return { channel: label, url, ok: false, error: error.message };
  }
}

/**
 * Run search-engine and indexer signals right after a post is published locally.
 */
export async function distributePublishedPost(slug) {
  const urls = {
    en: `${SITE_URL}/en/blog/${slug}`,
    ko: `${SITE_URL}/ko/blog/${slug}`,
  };
  const urlList = [urls.en, urls.ko, `${SITE_URL}/sitemap.xml`];

  const en = readPost(slug, "en");
  const ko = readPost(slug, "ko");
  const sharePack = buildSharePack({ slug, urls, en, ko });
  const sharePackPath = saveSharePack(slug, sharePack);
  console.log(`Share pack saved: ${sharePackPath}`);

  const results = [
    ...(await pingGoogleUrls([urls.en, urls.ko])),
    ...(await pingIndexNow(urlList)),
    ...(await pingSitemap()),
  ];

  const entry = {
    at: new Date().toISOString(),
    slug,
    urls,
    results,
    sharePackPath: path.relative(process.cwd(), sharePackPath),
  };
  appendLog(entry);

  console.log(`Distribution complete for ${slug} (${results.filter((r) => r.ok).length}/${results.length} ok)`);
  return entry;
}

/**
 * After Vercel deploy, warm RSS/sitemap caches so aggregators see fresh content.
 */
export async function warmDistributionCaches() {
  const targets = [
    { url: `${SITE_URL}/sitemap.xml`, label: "sitemap" },
    { url: `${SITE_URL}/en/feed.xml`, label: "rss-en" },
    { url: `${SITE_URL}/ko/feed.xml`, label: "rss-ko" },
  ];

  const results = [];
  for (const target of targets) {
    results.push(await warmUrl(target.url, target.label));
  }

  appendLog({
    at: new Date().toISOString(),
    action: "warm",
    results,
  });

  return results;
}

async function main() {
  const task = process.argv[2] ?? "help";

  if (task === "warm") {
    await warmDistributionCaches();
    return;
  }

  const slugFlag = process.argv.indexOf("--slug");
  const slug = slugFlag !== -1 ? process.argv[slugFlag + 1] : null;

  if (task === "distribute" && slug) {
    await distributePublishedPost(slug);
    return;
  }

  console.log(`Usage:
  node scripts/automation/distributor.mjs distribute --slug <slug>
  node scripts/automation/distributor.mjs warm`);
  process.exit(task === "help" ? 0 : 1);
}

if (process.argv[1]?.includes("distributor.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
