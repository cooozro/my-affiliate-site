#!/usr/bin/env node
/**
 * E2E simulation: B-type benchmark outline + body-write kickoff (dry-run).
 * Usage: node scripts/automation/test-benchmark-run.mjs [keyword]
 */

import fs from "fs";
import path from "path";
import { loadEnvFile } from "../lib/load-env.mjs";
import {
  getSearchCredentials,
  getSerpQuotaRemaining,
  getSerpProviderName,
  prepareBenchmarkOutline,
  readSerpCache,
} from "../lib/guardian/serp-benchmark.mjs";
import {
  formatOutlineForPrompt,
  logContentStrategyEvent,
} from "../lib/guardian/content-strategy.mjs";
import { buildGenerationPrompt } from "./prompts.mjs";

const forceRefresh = process.argv.includes("--refresh");
const cliArgs = process.argv.slice(2).filter((arg) => arg !== "--refresh");
const keyword = cliArgs[0] ?? "제빙기";
const contentProfile = "buying-guide";
const toneVariant = "data-driven";

const topic = {
  id: "ice-makers",
  category: "home-appliances",
  angle: "제빙기 구매가이드: 용량, 제빙 속도, 위생 관리 비교",
  searchKeyword: keyword,
  imageQuery: "ice maker kitchen appliance",
};

async function main() {
  loadEnvFile();

  const creds = getSearchCredentials();
  if (!creds) {
    console.error(`FAIL: SERPER_API_KEY missing in .env (provider: ${getSerpProviderName()})`);
    process.exit(1);
  }

  console.log(`SERP provider: ${creds.provider}`);

  const quotaBefore = getSerpQuotaRemaining();
  console.log(`\n=== Benchmark E2E test-run ===`);
  console.log(`Keyword (base): ${keyword}`);
  console.log(`Force refresh: ${forceRefresh}`);
  console.log(`SERP quota remaining (before): ${quotaBefore}/${100}`);

  const result = await prepareBenchmarkOutline(topic, contentProfile, toneVariant, {
    forceRefresh,
  });

  const quotaAfter = getSerpQuotaRemaining();
  const cached = readSerpCache(result.keyword ?? keyword);

  if (!result.ok) {
    logContentStrategyEvent({
      event: "test-run-failed",
      writingMode: "benchmark",
      contentProfile,
      topicId: topic.id,
      toneVariant,
      keyword: result.keyword ?? keyword,
      fallbackReason: result.reason,
    });
    console.error(`\nFAIL: outline — ${result.reason}`);
    process.exit(1);
  }

  const outline = result.outline;

  logContentStrategyEvent({
    event: "test-run-outline",
    writingMode: "benchmark",
    contentProfile,
    topicId: topic.id,
    toneVariant,
    keyword: result.keyword,
    h2Similarity: outline.h2Similarity,
    shingleOverlap: outline.shingleOverlap,
    sectionCount: outline.sections?.length ?? 0,
    serpCachePath: outline.serpCachePath,
    fromCache: outline.fromCache ?? false,
  });

  const year = new Date().getFullYear();
  const generationPrompt = buildGenerationPrompt(topic, year, contentProfile, {
    writingMode: "benchmark",
    toneVariant,
    benchmarkOutline: outline,
  });

  logContentStrategyEvent({
    event: "test-run-body-start",
    writingMode: "benchmark",
    contentProfile,
    topicId: topic.id,
    toneVariant,
    keyword: result.keyword,
    promptChars: generationPrompt.length,
    dryRun: true,
  });

  console.log(`\n✅ SERP + outline OK`);
  console.log(`   Search keyword: ${result.keyword ?? keyword}`);
  if (result.baseKeyword && result.baseKeyword !== result.keyword) {
    console.log(`   Base keyword: ${result.baseKeyword}`);
  }
  console.log(`   H2 sections: ${outline.sections.length}`);
  console.log(`   H2 similarity: ${outline.h2Similarity?.toFixed(3)}`);
  console.log(`   Shingle overlap: ${outline.shingleOverlap?.toFixed(3)}`);
  console.log(`   Cache: ${outline.serpCachePath ?? "n/a"}`);
  console.log(`   From cache: ${outline.fromCache ?? false}`);
  console.log(`   SERP items: ${cached?.itemCount ?? "n/a"}`);
  if (cached?.filterStats) {
    console.log(
      `   Filter: ${cached.filterStats.rawCount} raw → ${cached.filterStats.afterShoppingFilter} non-shopping (${cached.filterStats.preferredCount} editorial)`,
    );
  }
  if (cached?.domains?.length) {
    console.log(`   Domains: ${cached.domains.join(", ")}`);
  }
  console.log(`   Quota remaining (after): ${quotaAfter}/${100}`);

  console.log(`\n--- Outline preview ---\n`);
  console.log(formatOutlineForPrompt(outline));

  console.log(`\n--- Body generation prompt (first 600 chars) ---\n`);
  console.log(`${generationPrompt.slice(0, 600)}…`);
  console.log(`\n✅ Body-write phase simulated (dry-run, ${generationPrompt.length} char prompt ready)`);
}

main().catch((error) => {
  logContentStrategyEvent({
    event: "test-run-error",
    writingMode: "benchmark",
    keyword,
    fallbackReason: error instanceof Error ? error.message : String(error),
  });
  console.error(error);
  process.exit(1);
});
