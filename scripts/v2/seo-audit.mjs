#!/usr/bin/env node
/**
 * v2 SEO audit — admin-only draft updater (isolated from Guardian publish pipeline).
 *
 * Equivalent to requested v2/seo_audit.py (stack is Node.js).
 * Usage: npm run seo-audit:update
 *
 * Safety: READ published posts; WRITE only content/posts/aipick-seo-precision-report/ko.md
 */

import { loadEnvFile } from "../lib/load-env.mjs";
import { runSeoAuditAnalysis } from "./seo-audit/analyze.mjs";
import {
  fetchGaTopBlogPages,
  fetchGaTrafficSummary,
} from "./seo-audit/ga-report.mjs";
import { buildSeoAuditMarkdown } from "./seo-audit/report-builder.mjs";
import { writeSeoAuditDraft } from "./seo-audit/draft-writer.mjs";
import { SEO_AUDIT_SLUG } from "./seo-audit/constants.mjs";

async function main() {
  loadEnvFile();
  const root = process.cwd();

  console.log(`SEO audit starting — target draft: ${SEO_AUDIT_SLUG}`);

  const analysis = runSeoAuditAnalysis(root);
  const [traffic, topPages] = await Promise.all([
    fetchGaTrafficSummary(),
    fetchGaTopBlogPages(8),
  ]);

  const markdown = buildSeoAuditMarkdown(analysis, { traffic, topPages });
  const { koPath, reportPath } = writeSeoAuditDraft(root, markdown, {
    ...analysis,
    ga: { traffic, topPages },
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
