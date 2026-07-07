import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";

import {
  submitPublishedPost,
  warmFeedAndSitemap,
  DEFAULT_SITE_URL,
} from "../lib/index-submission.mjs";
import { readPost } from "./posts-fs.mjs";

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

function loadDistributedSlugs() {
  if (!fs.existsSync(LOG_PATH)) return new Set();
  const slugs = new Set();
  for (const line of fs.readFileSync(LOG_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.slug && entry.results?.some((r) => r.ok)) slugs.add(entry.slug);
    } catch {
      /* ignore */
    }
  }
  return slugs;
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

/**
 * Run search-engine URL submission after a post is published.
 */
export async function distributePublishedPost(slug, options = {}) {
  const en = readPost(slug, "en");
  const ko = readPost(slug, "ko");

  if (en.data.draft === true) {
    console.warn(`Skip distribution: ${slug} is still draft`);
    return null;
  }

  const submission = await submitPublishedPost(slug, options);
  const sharePackPath = saveSharePack(
    slug,
    buildSharePack({ slug, urls: submission.urls, en, ko }),
  );
  console.log(`Share pack saved: ${sharePackPath}`);

  const entry = {
    at: new Date().toISOString(),
    slug,
    urls: submission.urls,
    results: submission.results,
    okCount: submission.okCount,
    sharePackPath: path.relative(process.cwd(), sharePackPath),
  };
  appendLog(entry);

  console.log(
    `Distribution complete for ${slug} (${submission.okCount}/${submission.total} ok)`,
  );
  return entry;
}

export async function warmDistributionCaches() {
  const results = await warmFeedAndSitemap();
  appendLog({ at: new Date().toISOString(), action: "warm", results });
  return results;
}

function slugsFromGitDiff(base = "HEAD~1", head = "HEAD") {
  let diff = "";
  try {
    diff = execSync(`git diff --name-only ${base} ${head} -- content/posts`, {
      encoding: "utf8",
    });
  } catch {
    return [];
  }

  const slugs = new Set();
  for (const line of diff.split("\n")) {
    const match = line.match(/^content\/posts\/([^/]+)\/en\.md$/);
    if (match) slugs.add(match[1]);
  }
  return [...slugs];
}

function listPublishedSlugs() {
  const root = path.join(process.cwd(), "content", "posts");
  const out = [];
  for (const slug of fs.readdirSync(root, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    const enPath = path.join(root, slug.name, "en.md");
    if (!fs.existsSync(enPath)) continue;
    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (data.draft !== true) out.push(slug.name);
  }
  return out.sort();
}

/**
 * After git push: submit URLs for posts that were just published (draft→live).
 */
export async function distributeChangedPosts(options = {}) {
  const candidates = options.slugs?.length
    ? options.slugs
    : slugsFromGitDiff(options.base, options.head);

  const toSubmit = [];
  for (const slug of candidates) {
    const enPath = path.join(process.cwd(), "content", "posts", slug, "en.md");
    if (!fs.existsSync(enPath)) continue;
    const { data } = matter(fs.readFileSync(enPath, "utf8"));
    if (data.draft === true) continue;
    toSubmit.push(slug);
  }

  if (toSubmit.length === 0) {
    console.log("No newly published posts in this push — nothing to submit.");
    return [];
  }

  const entries = [];
  for (const slug of toSubmit) {
    entries.push(await distributePublishedPost(slug, options));
  }
  return entries.filter(Boolean);
}

/**
 * One-time catch-up for published posts never logged in distribution-log.jsonl.
 */
export async function distributeMissingPosts() {
  const published = listPublishedSlugs();
  const done = loadDistributedSlugs();
  const missing = published.filter((s) => !done.has(s));

  if (missing.length === 0) {
    console.log("All published posts already have a successful distribution log entry.");
    return [];
  }

  console.log(`Backfill index submission for ${missing.length} slug(s): ${missing.join(", ")}`);
  const entries = [];
  for (const slug of missing) {
    entries.push(await distributePublishedPost(slug));
  }
  return entries.filter(Boolean);
}

async function main() {
  const task = process.argv[2] ?? "help";

  if (task === "warm") {
    await warmDistributionCaches();
    return;
  }

  if (task === "on-push") {
    await distributeChangedPosts();
    return;
  }

  if (task === "backfill-missing") {
    await distributeMissingPosts();
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
  node scripts/automation/distributor.mjs on-push
  node scripts/automation/distributor.mjs backfill-missing
  node scripts/automation/distributor.mjs warm`);
  process.exit(task === "help" ? 0 : 1);
}

if (process.argv[1]?.includes("distributor.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export { DEFAULT_SITE_URL };
