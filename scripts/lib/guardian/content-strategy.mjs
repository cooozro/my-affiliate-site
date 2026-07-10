/**
 * Content strategy — A/B writing mode (stable vs benchmark), history, auto-fallback.
 */

import fs from "fs";
import path from "path";
import { pickContentProfile } from "../content-profiles.mjs";
import { prepareBenchmarkOutline } from "./serp-benchmark.mjs";

export const WRITING_MODES = ["stable", "benchmark"];
export const STRATEGY_WINDOW = 10;
export const TARGET_BENCHMARK_RATIO = 0.5;

export const TONE_VARIANTS = [
  "question-led",
  "case-study",
  "data-driven",
  "scenario-first",
  "myth-bust",
  "checklist-hook",
];

const LOG_PATH = path.join(
  process.cwd(),
  "data",
  "automation",
  "content-strategy-log.json",
);

function appendStrategyLog(entry) {
  let log = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
      log = Array.isArray(parsed) ? parsed : [];
    } catch {
      log = [];
    }
  }
  log.push({ ...entry, at: entry.at ?? new Date().toISOString() });
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, `${JSON.stringify(log.slice(-200), null, 2)}\n`, "utf8");
}

export function logContentStrategyEvent(entry) {
  appendStrategyLog(entry);
}

export function getContentStrategyHistory(state) {
  return (state.contentStrategyHistory ?? []).filter((e) => e.slug);
}

export function pickToneVariant(state) {
  const history = getContentStrategyHistory(state);
  const lastTone = history[history.length - 1]?.toneVariant;
  const pool = TONE_VARIANTS.filter((t) => t !== lastTone);
  const candidates = pool.length > 0 ? pool : TONE_VARIANTS;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? "question-led";
}

/**
 * Pick stable vs benchmark to keep ~50:50 over a sliding window.
 */
export function pickWritingMode(state) {
  const history = getContentStrategyHistory(state).slice(-STRATEGY_WINDOW);
  const benchmarkCount = history.filter((e) => e.writingMode === "benchmark").length;
  const ratio = history.length === 0 ? 0.5 : benchmarkCount / history.length;

  if (ratio < TARGET_BENCHMARK_RATIO - 0.05) return "benchmark";
  if (ratio > TARGET_BENCHMARK_RATIO + 0.05) return "stable";

  const last = history[history.length - 1]?.writingMode;
  if (last === "benchmark") return "stable";
  if (last === "stable") return "benchmark";
  return Math.random() < 0.5 ? "benchmark" : "stable";
}

export function recordContentStrategy(state, entry) {
  const record = {
    writingMode: entry.writingMode,
    contentProfile: entry.contentProfile,
    topicId: entry.topicId ?? null,
    toneVariant: entry.toneVariant ?? null,
    slug: entry.slug ?? null,
    fallbackFrom: entry.fallbackFrom ?? null,
    fallbackReason: entry.fallbackReason ?? null,
    keyword: entry.keyword ?? null,
    at: new Date().toISOString(),
  };

  state.contentStrategyHistory = [
    ...getContentStrategyHistory(state),
    record,
  ].slice(-50);

  appendStrategyLog(record);
  return record;
}

/**
 * One-stop strategy for the next draft: profile + mode + optional benchmark outline.
 * On benchmark failure, auto-fallback to stable (no human approval).
 */
export async function prepareDraftStrategy(state, topic, options = {}) {
  const contentProfile = options.contentProfile ?? pickContentProfile(state);
  const toneVariant = pickToneVariant(state);
  let writingMode =
    options.writingMode ??
    (topic.isMetaAngle ? "benchmark" : pickWritingMode(state));
  let outline = null;
  let keyword = null;
  let fallbackFrom = null;
  let fallbackReason = null;
  let serpCachePath = null;

  if (writingMode === "benchmark") {
    const result = await prepareBenchmarkOutline(topic, contentProfile, toneVariant);
    if (result.ok) {
      outline = result.outline;
      keyword = result.keyword;
      serpCachePath = result.outline.serpCachePath ?? null;
    } else if (topic.isMetaAngle && topic.metaAngle?.benchmarkOutline) {
      outline = {
        ...topic.metaAngle.benchmarkOutline,
        toneVariant,
        keyword: topic.searchKeyword ?? result.keyword,
        serpSources: [],
        h2Similarity: 0,
        shingleOverlap: 0,
        embedded: true,
      };
      keyword = topic.searchKeyword ?? result.keyword;
      console.log(
        `Benchmark outline: embedded meta-angle structure (${topic.metaAngle.id}; SERP fallback)`,
      );
    } else {
      fallbackFrom = "benchmark";
      fallbackReason = result.reason ?? "benchmark outline failed";
      writingMode = "stable";
      keyword = result.keyword ?? null;
      console.warn(
        `Content strategy fallback: benchmark → stable (${fallbackReason})`,
      );
    }
  }

  const strategy = {
    writingMode,
    contentProfile,
    toneVariant,
    outline,
    keyword,
    serpCachePath,
    fallbackFrom,
    fallbackReason,
  };

  logContentStrategyEvent({
    event: "planned",
    writingMode,
    contentProfile,
    topicId: topic?.id,
    toneVariant,
    fallbackFrom,
    fallbackReason,
    keyword,
  });

  return strategy;
}

export function formatOutlineForPrompt(outline) {
  if (!outline?.sections?.length) return "";

  const lines = [
    "BENCHMARK OUTLINE (mandatory structure — paraphrase all headings; do not copy SERP sentences):",
    `Tone: ${outline.toneVariant}`,
    `Keyword researched: ${outline.keyword ?? "n/a"}`,
    "",
  ];

  for (const section of outline.sections) {
    lines.push(`## ${section.h2}`);
    for (const h3 of section.h3 ?? []) {
      lines.push(`### ${h3}`);
    }
  }

  if (outline.serpSources?.length) {
    lines.push("");
    lines.push(
      "SERP reference URLs (for methodology citation only — never copy their prose):",
    );
    for (const source of outline.serpSources.slice(0, 5)) {
      lines.push(`- ${source.title}: ${source.url}`);
    }
  }

  lines.push("");
  lines.push(
    `Originality gates passed: H2 similarity ${outline.h2Similarity?.toFixed?.(2) ?? "n/a"}, shingle overlap ${outline.shingleOverlap?.toFixed?.(2) ?? "n/a"}`,
  );

  return lines.join("\n");
}
