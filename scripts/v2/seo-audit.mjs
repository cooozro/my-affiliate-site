#!/usr/bin/env node
/**
 * v2 SEO audit — admin-only draft updater (isolated from Guardian publish pipeline).
 *
 * Equivalent to requested v2/seo_audit.py (stack is Node.js).
 * Usage: npm run seo-audit:update
 *
 * Safety: READ published posts; WRITE only content/posts/aipick-seo-precision-report/ko.md
 */

import fs from "fs";
import path from "path";

import { loadEnvFile, logGa4EnvStatus } from "../lib/load-env.mjs";
import { runSeoAuditAnalysis } from "./seo-audit/analyze.mjs";
import { buildAdsenseAnalysis } from "./seo-audit/adsense.mjs";
import { fetchGaReportBundle } from "./seo-audit/ga-report.mjs";
import { buildSeoAuditMarkdown } from "./seo-audit/report-builder.mjs";
import { writeSeoAuditDraft } from "./seo-audit/draft-writer.mjs";
import { SEO_AUDIT_REPORT_JSON, SEO_AUDIT_SLUG } from "./seo-audit/constants.mjs";

/** Reuse the last committed GA snapshot when live GA is unavailable (e.g. local run without keys). */
function loadCachedGa(root) {
  try {
    const snapshotPath = path.join(root, SEO_AUDIT_REPORT_JSON);
    const cached = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    if (cached?.ga?.traffic && cached.ga.meta?.connected) {
      return cached.ga;
    }
  } catch {
    // no usable cache
  }
  return null;
}

async function main() {
  loadEnvFile();
  logGa4EnvStatus();
  const root = process.cwd();

  console.log(`SEO audit starting — target draft: ${SEO_AUDIT_SLUG}`);

  const analysis = runSeoAuditAnalysis(root);
  const adsense = buildAdsenseAnalysis(root);
  console.log(
    `[AdSense] readiness ${adsense.readiness}% — ${adsense.counted} indexed posts, ` +
      `avg ${adsense.avg} (target ${adsense.target}), ${adsense.hiddenCount} quarantined`,
  );

  let ga = await fetchGaReportBundle({ topPagesLimit: 8 });
  if (!ga.meta?.connected) {
    const cached = loadCachedGa(root);
    if (cached) {
      console.warn(
        `[GA4] live fetch unavailable (${ga.meta?.error ?? "unknown"}) — reusing last committed snapshot`,
      );
      ga = cached;
    }
  }
  const { traffic, topPages = [], meta } = ga;

  if (meta.connected && traffic) {
    console.log(
      `[GA4] connected — property ${meta.propertyIdMasked}, ` +
        `users ${traffic.activeUsers7d}, sessions ${traffic.sessions7d}, ` +
        `views ${traffic.pageViews7d} (queried ${meta.fetchedAtKst})`,
    );
  } else {
    console.warn(`[GA4] not connected — ${meta.error ?? "unknown"}`);
  }

  const markdown = buildSeoAuditMarkdown(analysis, { traffic, topPages, meta }, adsense);
  const { koPath, reportPath } = writeSeoAuditDraft(root, markdown, {
    ...analysis,
    adsense,
    ga: { traffic, topPages, meta },
  });

  console.log(`SEO audit draft updated: ${koPath}`);
  console.log(`JSON snapshot: ${reportPath}`);
  console.log(
    `Averages — structure: ${analysis.averages.structureIntent}%, ` +
      `JSON-LD: ${analysis.averages.jsonLdReadiness}%, ` +
      `defense: ${analysis.averages.qualityDefense}%`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
