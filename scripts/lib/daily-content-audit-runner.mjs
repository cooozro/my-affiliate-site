/**
 * Daily full-corpus content audit runner.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { listDrafts } from "../automation/posts-fs.mjs";
import { kstDateString, loadState, saveState } from "../automation/state.mjs";
import { sitePostUrls } from "./content-policy.mjs";
import { listPublishedSlugs } from "./content-quality.mjs";
import {
  integrityIssuesFlat,
  runPublishIntegrityGate,
} from "./publish-integrity.mjs";
import { repairAllRelatedGuides } from "./related-guides.mjs";
import { MAX_PUBLISH_PER_DAY } from "./publish-schedule.mjs";

const AUDIT_REPORT_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "daily-content-audit.json",
);

const END_OF_DAY_KST_HOUR = 23;

function isDraftSlug(root, slug) {
  const enPath = path.join(root, "content", "posts", slug, "en.md");
  if (!fs.existsSync(enPath)) return false;
  const { data } = matter(fs.readFileSync(enPath, "utf8"));
  return Boolean(data.draft);
}

export function shouldRunDailyContentAudit(state, now = new Date()) {
  const today = kstDateString(now);
  if (state.lastDailyContentAuditKst === today) return false;

  const publishToday =
    state.publishDateKst === today ? (state.publishCountToday ?? 0) : 0;
  const dailyPublishComplete = publishToday >= MAX_PUBLISH_PER_DAY;

  const kstHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  const endOfDayCatchUp =
    state.publishDateKst === today && kstHour >= END_OF_DAY_KST_HOUR;

  return dailyPublishComplete || endOfDayCatchUp;
}

function collectSlugsToScan(root) {
  const published = listPublishedSlugs(root);
  const drafts = listDrafts().map((d) => d.slug);
  return [...new Set([...published, ...drafts])].sort();
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(AUDIT_REPORT_PATH), { recursive: true });
  fs.writeFileSync(AUDIT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function readDailyContentAuditReport() {
  if (!fs.existsSync(AUDIT_REPORT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Scan all posts, apply safe auto-repairs, return report.
 */
export function runDailyContentAudit(root = process.cwd(), options = {}) {
  const state = options.state ?? loadState();
  const slugs = collectSlugsToScan(root);
  const autoRepairs = [];
  const manualReview = [];
  let scanned = 0;

  for (const slug of slugs) {
    const phase = isDraftSlug(root, slug) ? "draft" : "publish";
    const result = runPublishIntegrityGate(root, slug, {
      phase,
      state,
      applyRepair: true,
    });
    scanned += 1;

    if (result.repairs.length > 0) {
      autoRepairs.push({ slug, repairs: result.repairs });
    }

    if (!result.ok && !result.exempt) {
      const issues = integrityIssuesFlat(result).filter(
        (issue) => !issue.includes("Related guides has"),
      );
      if (issues.length === 0) continue;
      manualReview.push({
        slug,
        phase,
        issues,
        urls: sitePostUrls(slug),
      });
    }
  }

  const today = kstDateString();
  const report = {
    dateKst: today,
    scannedAt: new Date().toISOString(),
    postsScanned: scanned,
    autoRepairCount: autoRepairs.reduce((n, r) => n + r.repairs.length, 0),
    autoRepairs,
    manualReviewCount: manualReview.length,
    manualReview: manualReview.map((item, index) => ({
      order: index + 1,
      ...item,
    })),
  };

  writeReport(report);

  state.lastDailyContentAuditKst = today;
  state.lastDailyContentAudit = {
    at: report.scannedAt,
    postsScanned: scanned,
    autoRepairCount: report.autoRepairCount,
    manualReviewCount: report.manualReviewCount,
  };
  saveState(state);

  return report;
}

export function runDailyContentAuditIfDue(root = process.cwd(), options = {}) {
  const state = options.state ?? loadState();
  if (!shouldRunDailyContentAudit(state)) {
    return { ran: false, reason: "not-due" };
  }

  console.log("Daily content audit: scanning all published posts and drafts…");
  const relatedSummary = repairAllRelatedGuides(root, { includeDrafts: true });
  if (relatedSummary.repairs.length > 0) {
    console.log(
      `Related guides auto-repair: ${relatedSummary.changed} post(s), ${relatedSummary.repairs.length} change(s)`,
    );
  }
  const report = runDailyContentAudit(root, { state });

  console.log(
    `Daily content audit complete: ${report.postsScanned} posts, ${report.autoRepairCount} auto-repair(s), ${report.manualReviewCount} need manual review.`,
  );

  if (report.manualReviewCount > 0) {
    console.warn("Manual review queue:");
    for (const item of report.manualReview) {
      console.warn(`  ${item.order}. ${item.slug}`);
      console.warn(`     EN: ${item.urls.en}`);
      console.warn(`     KO: ${item.urls.ko}`);
      console.warn(`     Admin: ${item.urls.admin}`);
      for (const issue of item.issues.slice(0, 3)) {
        console.warn(`     - ${issue}`);
      }
    }
  }

  return { ran: true, report };
}
