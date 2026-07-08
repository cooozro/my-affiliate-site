#!/usr/bin/env node
/**
 * Help-nav health gate — compare SEO/integrity metrics to baseline; exit 1 triggers rollback.
 * Usage: npm run help-nav:health
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { runSeoAuditAnalysis } from "./v2/seo-audit/analyze.mjs";

const BASELINE_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "help-nav-health-baseline.json",
);

const HELP_NAV_FILES = [
  "lib/help-nav.ts",
  "components/article-layout.tsx",
  "lib/posts.ts",
  "scripts/lib/help-nav.mjs",
  "content/posts/welcome/en.md",
  "content/posts/welcome/ko.md",
];

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Missing baseline: ${BASELINE_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

function currentMetrics() {
  const analysis = runSeoAuditAnalysis();
  const errorPosts = analysis.posts.filter((p) => p.riskIssues.length > 0).length;
  const scanPassPct =
    analysis.localeScanCount === 0
      ? 0
      : Math.round(
          ((analysis.localeScanCount - errorPosts) / analysis.localeScanCount) *
            100,
        );

  return {
    scanPassPct,
    seoStructure: analysis.averages.structureIntent,
    seoJsonLd: analysis.averages.jsonLdReadiness,
    seoDefense: analysis.averages.qualityDefense,
    errorPosts,
    localeScanCount: analysis.localeScanCount,
  };
}

function runIntegrityCheck() {
  try {
    const output = execSync("node scripts/check-integrity.mjs", {
      stdio: "pipe",
      encoding: "utf8",
    });
    return { ok: true, output, failureCount: 0 };
  } catch (error) {
    const output = [
      error.stdout?.toString?.() ?? "",
      error.stderr?.toString?.() ?? "",
    ].join("\n");
    const failureCount = (output.match(/^--- /gm) ?? []).length;
    return { ok: false, output, failureCount };
  }
}

function runContentValidate() {
  try {
    execSync("node scripts/validate-post.mjs", { stdio: "pipe", encoding: "utf8" });
    return { ok: true, output: "" };
  } catch (error) {
    const output =
      error.stdout?.toString?.() ?? error.stderr?.toString?.() ?? String(error);
    return { ok: false, output };
  }
}

function attemptRollback(reason) {
  console.error("\n🚨 HELP-NAV HEALTH GATE FAILED — initiating rollback");
  console.error(`Reason: ${reason}\n`);
  for (const rel of HELP_NAV_FILES) {
    try {
      execSync(`git checkout HEAD -- "${rel}"`, { stdio: "pipe" });
      console.error(`  reverted: ${rel}`);
    } catch {
      try {
        execSync(`git rm -f --cached "${rel}" 2>nul`, { stdio: "pipe" });
        if (fs.existsSync(rel)) fs.unlinkSync(rel);
        console.error(`  removed untracked: ${rel}`);
      } catch {
        console.error(`  skip (not in git): ${rel}`);
      }
    }
  }
  console.error("\nRollback complete. Re-run npm run help-nav:health to confirm.");
}

function main() {
  const baseline = loadBaseline();
  const threshold = baseline.rollbackThresholdPct ?? 5;
  const current = currentMetrics();

  console.log("Help-nav health check");
  console.log("—".repeat(40));
  console.log("Baseline:", JSON.stringify(baseline, null, 2));
  console.log("Current: ", JSON.stringify(current, null, 2));

  const validate = runContentValidate();
  const integrity = runIntegrityCheck();

  const regressions = [];
  if (baseline.scanPassPct - current.scanPassPct >= threshold) {
    regressions.push(
      `scan pass rate dropped ${baseline.scanPassPct}% → ${current.scanPassPct}%`,
    );
  }
  if (baseline.seoDefense - current.seoDefense >= threshold) {
    regressions.push(
      `quality defense dropped ${baseline.seoDefense}% → ${current.seoDefense}%`,
    );
  }
  if (current.errorPosts > baseline.errorPosts) {
    regressions.push(
      `error posts increased ${baseline.errorPosts} → ${current.errorPosts}`,
    );
  }
  if (!validate.ok) {
    regressions.push(`content:validate failed:\n${validate.output}`);
  }

  const allowedIntegrityFailures = baseline.integrityAllowedFailures ?? 0;
  if (integrity.failureCount > allowedIntegrityFailures) {
    regressions.push(
      `integrity failures increased above baseline (${allowedIntegrityFailures} allowed, got ${integrity.failureCount})`,
    );
  }

  if (regressions.length > 0) {
    const reason = regressions.join("; ");
    if (process.argv.includes("--rollback")) {
      attemptRollback(reason);
    }
    console.error("\nFAILED:", reason);
    process.exit(1);
  }

  console.log("\nPASSED — no rollback required.");
  console.log(
    `Δ scan pass: ${current.scanPassPct - baseline.scanPassPct}pp | ` +
      `Δ defense: ${current.seoDefense - baseline.seoDefense}pp | ` +
      `Δ errors: ${current.errorPosts - baseline.errorPosts}`,
  );
  if (!integrity.ok) {
    console.log(
      `integrity:check — ${integrity.failureCount} known failure(s) within baseline allowance`,
    );
  }
}

main();
