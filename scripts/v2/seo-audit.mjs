#!/usr/bin/env node
/**
 * v2 SEO audit — admin-only draft updater (isolated from Guardian publish pipeline).
 *
 * Equivalent to requested v2/seo_audit.py (stack is Node.js).
 * Usage: npm run seo-audit:update
 *
 * Safety: READ published posts; WRITE only content/posts/aipick-seo-precision-report/ko.md
 */

import { loadEnvFile, logGa4EnvStatus } from "../lib/load-env.mjs";
import { runSeoAuditAnalysis } from "./seo-audit/analyze.mjs";
import { fetchGaReportBundle } from "./seo-audit/ga-report.mjs";
import { buildSeoAuditMarkdown } from "./seo-audit/report-builder.mjs";
import { writeSeoAuditDraft } from "./seo-audit/draft-writer.mjs";
import { SEO_AUDIT_SLUG } from "./seo-audit/constants.mjs";

async function main() {
  loadEnvFile();
  logGa4EnvStatus();
  const root = process.cwd();

  console.log(`SEO audit starting — target draft: ${SEO_AUDIT_SLUG}`);

  const analysis = runSeoAuditAnalysis(root);
  const ga = await fetchGaReportBundle({ topPagesLimit: 8 });
  const { traffic, topPages, meta } = ga;

  if (meta.connected && traffic) {
    console.log(
      `[GA4] connected — property ${meta.propertyIdMasked}, ` +
        `users ${traffic.activeUsers7d}, sessions ${traffic.sessions7d}, ` +
        `views ${traffic.pageViews7d} (queried ${meta.fetchedAtKst})`,
    );
  } else {
    console.warn(`[GA4] not connected — ${meta.error ?? "unknown"}`);
  }

  const markdown = buildSeoAuditMarkdown(analysis, { traffic, topPages, meta });
  const { koPath, reportPath } = writeSeoAuditDraft(root, markdown, {
    ...analysis,
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
