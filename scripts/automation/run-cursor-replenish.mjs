#!/usr/bin/env node
/**
 * Draft replenish on GitHub Actions (Plan A).
 * Uses Cursor SDK when CURSOR_API_KEY is set. OpenAI is optional fallback only.
 */

import fs from "fs";
import path from "path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { fetchCoverImage } from "./fetch-image.mjs";
import { resolveImageContext, buildCoverAlts } from "../lib/image-query.mjs";
import {
  completeCursorDraftRequest,
  readCursorDraftRequest,
  recordReplenishAttempt,
  recordReplenishFailure,
  requeueCursorDraftReplenish,
  saveCursorDraftRequest,
} from "./cursor-draft-request.mjs";
import { generateDraftFromRequest } from "./generate-draft.mjs";
import { pickTopic } from "./topics.mjs";
import { loadState, saveState } from "./state.mjs";
import {
  countDrafts,
  ensureDraftCreatedAt,
  listDrafts,
  listSlugDirs,
  readPost,
  validatePostFiles,
  validateDraftPublishReady,
  writePost,
} from "./posts-fs.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";
import { loadEnvFile } from "../lib/load-env.mjs";
import {
  formatOutlineForPrompt,
  recordContentStrategy,
} from "../lib/guardian/content-strategy.mjs";
import { pickContentProfile, getTemplatePath } from "../lib/content-profiles.mjs";
import { listPublishedSlugs } from "../lib/content-quality.mjs";
import {
  isRequestTopicStale,
  removeReplenishSlugArtifacts,
  reservedSlugListForPrompt,
  revertPostSlugFromGit,
  validateReplenishTopicUnique,
  validateReplenishWrittenSlug,
} from "../lib/automation-guard.mjs";

import {
  describeRoadmapPhase,
  getRoadmapPhase,
} from "../lib/content-roadmap.mjs";
import { getTopicFormatCoverage } from "../lib/topic-coverage.mjs";

function buildCursorPrompt(request) {
  const topic = request.topic ?? {};
  const contentProfile = request.contentProfile ?? "buying-guide";
  const writingMode = request.writingMode ?? "stable";
  const templatePath = request.templatePath ?? getTemplatePath(contentProfile);
  const publishedSlugs = [...listPublishedSlugs(process.cwd())].sort().join(", ");
  const reservedSlugs = reservedSlugListForPrompt().join(", ");
  const coverage = getTopicFormatCoverage();
  const roadmapPhase = getRoadmapPhase(coverage);
  const roadmapNote = describeRoadmapPhase(roadmapPhase, coverage);

  const benchmarkBlock =
    writingMode === "benchmark" && request.benchmarkOutline
      ? `\n\n${formatOutlineForPrompt(request.benchmarkOutline)}\n`
      : "";

  const modeNote =
    writingMode === "benchmark"
      ? `BENCHMARK mode: follow the outline below. Paraphrase every section; zero copied sentences from SERP sources. Tone: ${request.toneVariant ?? "editorial"}.\n`
      : `STABLE mode: follow ${templatePath} section structure exactly.\n`;

  return `Replenish the blog draft buffer for AI Pick (Plan A — Cursor writes, no OpenAI).

Read first:
- docs/CONTENT_STANDARDS.md
- ${templatePath}
- scripts/lib/editorial-standards.mjs
- data/automation/cursor-draft-request.json

${modeNote}
Write exactly ONE bilingual draft:
- Files: content/posts/{slug}/en.md and ko.md
- Frontmatter: draft:true, contentProfile:${contentProfile}, writingMode:${writingMode}
${benchmarkBlock}
- Topic id: ${topic.id ?? "see request file"} (assigned by content roadmap — do not swap to bluetooth-speakers/window-ac unless this IS the assigned topic)
- Content roadmap phase: ${roadmapPhase} — ${roadmapNote}
- Category: ${topic.category ?? ""}
- Angle: ${topic.angle ?? ""}
- Season priority: ${request.season ?? "current KST season"}${request.seasonalEvents?.length ? ` (${request.seasonalEvents.join(", ")})` : ""}
- Slug MUST be brand-new: pick a slug that does NOT already exist under content/posts/
- FORBIDDEN slugs (never write to these paths): ${reservedSlugs}
- Suggested pattern: 2026-${topic.id ?? "topic"}-${contentProfile} (add suffix if taken)
- liveData: ${topic.liveData ? "true — use {{today}}, {{today_locale}}, {{usd_krw_rate}}, {{krw:29.99}}" : "false"}

Follow ${templatePath} for section structure.

Content requirements (each locale):
- Meet minimum length for profile ${contentProfile}
- Meta description **50–160 characters** (frontmatter \`description\`)
- **FAQ section** (\`## FAQ\` EN / \`## 자주 묻는 질문\` KO) with ≥3 \`###\` Q&A pairs — required for publish gate
- Analysis methodology table (editorial sources only — no seller API claims)
- Related guides section with /en/blog/ or /ko/blog/ internal links — **only** these published slugs: ${publishedSlugs}
- Varied title (avoid formulaic "2026 가성비 X TOP 5")

After writing posts:
1. Run \`node scripts/check-integrity.mjs {slug} --draft --repair\` — must pass with zero errors before marking complete
2. Set data/automation/cursor-draft-request.json to status "complete" with writtenSlug and completedAt
3. Keep draft:true — do not publish
4. Do not git commit (CI commits)

Never overwrite or edit an existing post directory. Minimize scope. Only the one NEW draft.`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatCursorRunFailure(result) {
  const parts = [`run ${result.id ?? "unknown"}`];
  if (typeof result.durationMs === "number") {
    parts.push(`${Math.round(result.durationMs / 1000)}s`);
  }
  if (result.error?.message) {
    parts.push(result.error.message);
  } else if (result.error?.code) {
    parts.push(result.error.code);
  }
  return parts.join(" — ");
}

function cursorRetryDelaysMs() {
  // User accepts slow replenish; on GHA wait longer between attempts in one job.
  if (process.env.GITHUB_ACTIONS) return [120_000, 300_000, 600_000];
  return [30_000, 90_000];
}

function isRetryableCursorError(error) {
  if (error instanceof CursorAgentError) {
    return Boolean(error.isRetryable);
  }
  return false;
}

function isRetryableCursorRunResult(result) {
  const msg = `${result.error?.message ?? ""} ${result.error?.code ?? ""}`.toLowerCase();
  return /rate|limit|usage|busy|timeout|unavailable|429|503|throttl/.test(msg);
}

async function runCursorAgentOnce(request) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) return null;

  const prompt = buildCursorPrompt(request);
  const model = { id: "composer-2.5" };
  const agentOptions = {
    apiKey,
    model,
    local: { cwd: process.cwd(), settingSources: [] },
  };

  await using agent = await Agent.create(agentOptions);
  const run = await agent.send(prompt);

  for await (const event of run.stream()) {
    if (event.type === "assistant") {
      for (const block of event.message.content) {
        if (block.type === "text") {
          const line = block.text.trim();
          if (line) console.log(`[cursor] ${line.slice(0, 200)}`);
        }
      }
    } else if (event.type === "tool_call") {
      console.log(`[cursor tool] ${event.name}: ${event.status}`);
    } else if (event.type === "status") {
      console.log(`[cursor status] ${event.status}`);
    }
  }

  const result = await run.wait();
  return result;
}

function rejectReplenishOverwrite(slug, reason) {
  removeReplenishSlugArtifacts(slug);
  revertPostSlugFromGit(slug);
  recordReplenishFailure(reason);
  console.error(reason);
}

/** Plan A: Cursor first. OpenAI only when CURSOR_API_KEY is absent. */
function pickReplenishProviders({ cursorKey, openaiKey }) {
  const providers = [];
  if (cursorKey) providers.push("cursor");
  if (openaiKey) providers.push("openai");
  return providers;
}

async function runReplenishProviders(request, draftsBefore, keys) {
  const providers = pickReplenishProviders(keys);
  const errors = [];

  for (const provider of providers) {
    try {
      if (provider === "openai") {
        const slugs = await replenishWithOpenAI(request);
        if (slugs.length > 0) return slugs;
        errors.push("OpenAI replenish returned no draft");
        continue;
      }

      const slug = await replenishWithCursor(request, draftsBefore);
      if (slug) return [slug];
      errors.push("Cursor replenish returned no draft");
    } catch (error) {
      const message =
        error instanceof CursorAgentError
          ? `Cursor agent: ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);
      errors.push(message);
      console.error(`${provider} replenish failed: ${message}`);
    }
  }

  if (errors.length === 0) {
    throw new Error(
      "CURSOR_API_KEY missing in GitHub Secrets (Settings → Secrets → Actions).",
    );
  }

  throw new Error(errors.join(" | "));
}

function refreshStaleRequestTopic(request) {
  if (!isRequestTopicStale(request)) return request;

  const assignedId = request.topic?.id;
  const state = loadState();
  const contentProfile =
    request.contentProfile ?? pickContentProfile(state);
  const topic = pickTopic(state, { contentProfile });
  saveState(state);

  console.log(
    `Replenish topic rotated: ${assignedId} already has a post → ${topic.id} (${contentProfile})`,
  );

  return {
    ...request,
    contentProfile,
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
      seasons: topic.seasons,
    },
    templatePath: getTemplatePath(contentProfile),
    lastError: null,
  };
}

function coverFileExists(slug) {
  const enPath = path.join(process.cwd(), "content", "posts", slug, "en.md");
  if (!fs.existsSync(enPath)) return false;

  const { data } = readPost(slug, "en");
  if (data.coverImage?.startsWith("/images/posts/")) {
    const imagePath = path.join(process.cwd(), "public", data.coverImage);
    if (fs.existsSync(imagePath)) return true;
  }

  const dir = path.join(process.cwd(), "public", "images", "posts", slug);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((name) => /\.(jpe?g|webp|png)$/i.test(name));
}

async function ensureCoverImage(slug, topic) {
  if (coverFileExists(slug)) return;

  const { data } = readPost(slug, "en");
  const imageContext = resolveImageContext(slug, {
    title: data.title,
    tags: data.tags,
    imageSearchKeywords: data.imageSearchKeywords ?? topic?.imageSearchKeywords,
    imageQuery: topic?.imageQuery,
    topicCluster: topic?.topicCluster ?? data.topicCluster,
    topic,
  });

  const meta = await fetchCoverImage(slug, imageContext);
  if (!meta) return;

  const alts = buildCoverAlts(imageContext);

  for (const locale of ["en", "ko"]) {
    const postPath = path.join(process.cwd(), "content", "posts", slug, `${locale}.md`);
    if (!fs.existsSync(postPath)) continue;
    const { data: postData, content } = readPost(slug, locale);
    writePost(
      slug,
      locale,
      {
        ...postData,
        ...meta,
        coverImageAlt: locale === "ko" ? alts.ko : alts.en,
        coverImageAltKo: alts.ko,
        ...(meta.coverImageAssetId != null
          ? { coverImageAssetId: meta.coverImageAssetId }
          : {}),
        ...(meta.coverImageSourceUrl
          ? { coverImageSourceUrl: meta.coverImageSourceUrl }
          : {}),
      },
      content,
    );
  }
}

function requestForNextOpenAiDraft(request, index) {
  if (index === 0) return request;

  const state = loadState();
  const topic = pickTopic(state, { contentProfile: request.contentProfile });
  saveState(state);

  return {
    ...request,
    topic: {
      id: topic.id,
      category: topic.category,
      angle: topic.angle,
      imageQuery: topic.imageQuery,
      liveData: topic.liveData,
      seasons: topic.seasons,
    },
  };
}

async function replenishWithOpenAI(request) {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) return [];

  const created = [];
  const maxCreates = Math.min(
    typeof request.needed === "number" ? request.needed : TARGET_DRAFT_COUNT,
    TARGET_DRAFT_COUNT - countDrafts(),
  );

  for (let i = 0; i < maxCreates && countDrafts() < TARGET_DRAFT_COUNT; i += 1) {
    const activeRequest = requestForNextOpenAiDraft(request, i);
    console.log(
      `OpenAI replenish ${i + 1}/${maxCreates}: topic=${activeRequest.topic?.id}`,
    );
    const slug = await generateDraftFromRequest(activeRequest, {
      bypassWriteCap: true,
    });
    if (!slug) break;
    created.push(slug);
  }

  return created;
}

async function replenishWithCursor(request, draftsBefore) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) return null;

  console.log(
    `Cursor replenish starting: topic=${request.topic?.id ?? "unknown"}, mode=${request.writingMode ?? "stable"}, needed=${request.needed}`,
  );
  console.log(`Node ${process.version} (Cursor local agent needs >= 22.13 for node:sqlite)`);

  const delays = cursorRetryDelaysMs();
  let lastMessage = "unknown error";

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      const result = await runCursorAgentOnce(request);

      if (result.status === "error") {
        lastMessage = `Cursor agent run failed: ${formatCursorRunFailure(result)}`;
        const instantFail =
          typeof result.durationMs === "number" && result.durationMs < 15_000;
        if (instantFail) {
          console.warn(
            "Cursor agent ended in <15s — often usage cap or API rejection (not a slow queue). IDE chat can still work on a separate meter.",
          );
        }
        if (!isRetryableCursorRunResult(result) || attempt >= delays.length) {
          throw new Error(lastMessage);
        }
        const waitMs = delays[attempt];
        console.warn(
          `Cursor replenish retry ${attempt + 1}/${delays.length} in ${Math.round(waitMs / 1000)}s: ${lastMessage}`,
        );
        await sleep(waitMs);
        continue;
      }

      console.log(
        `Cursor agent finished ${result.status} (id=${result.id ?? "n/a"}, ${Math.round((result.durationMs ?? 0) / 1000)}s)`,
      );

      const updated = readCursorDraftRequest();
      let writtenSlug =
        typeof updated?.writtenSlug === "string" ? updated.writtenSlug : null;

      if (!writtenSlug) {
        const newDrafts = listDrafts().filter((d) => !draftsBefore.has(d.slug));
        writtenSlug = newDrafts[0]?.slug ?? null;
      }

      return writtenSlug;
    } catch (error) {
      lastMessage =
        error instanceof CursorAgentError
          ? `Cursor agent: ${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);

      const retryable = isRetryableCursorError(error);
      const hasMoreAttempts = attempt < delays.length;

      if (!retryable || !hasMoreAttempts) {
        throw error instanceof Error ? error : new Error(lastMessage);
      }

      const waitMs = delays[attempt];
      console.warn(
        `Cursor replenish retry ${attempt + 1}/${delays.length} in ${Math.round(waitMs / 1000)}s: ${lastMessage}`,
      );
      await sleep(waitMs);
    }
  }

  throw new Error(lastMessage);
}

async function main() {
  loadEnvFile();

  let request = readCursorDraftRequest();
  if (!request || request.status !== "pending") {
    console.log("No pending cursor draft request — skip");
    return;
  }

  request = refreshStaleRequestTopic(request);
  saveCursorDraftRequest({ ...request, status: "pending" });

  if (countDrafts() >= TARGET_DRAFT_COUNT) {
    completeCursorDraftRequest(null);
    console.log(`Draft buffer already full (${countDrafts()}/${TARGET_DRAFT_COUNT})`);
    return;
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const cursorKey = process.env.CURSOR_API_KEY?.trim();
  if (!cursorKey && !openaiKey) {
    const message =
      "CURSOR_API_KEY missing in GitHub Secrets (Settings → Secrets → Actions). " +
      "Create at https://cursor.com/dashboard/integrations — chat/IDE keys are not auto-synced.";
    recordReplenishFailure(message);
    console.error(message);
    // Exit 0 so publish/validate steps still run; pending request retries on next cron.
    return;
  }

  recordReplenishAttempt();
  const draftsBefore = new Set(listDrafts().map((d) => d.slug));
  const slugsBefore = new Set(listSlugDirs());
  let createdSlugs = [];

  try {
    createdSlugs = await runReplenishProviders(request, draftsBefore, {
      cursorKey,
      openaiKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordReplenishFailure(message);
    console.error(message);
    // Exit 0 so publish/validate steps still run; pending request retries on next cron.
    return;
  }

  if (createdSlugs.length === 0) {
    const message = "Replenish finished but no new draft was created.";
    recordReplenishFailure(message);
    console.error(message);
    return;
  }

  for (const slug of createdSlugs) {
    const slugCheck = validateReplenishWrittenSlug(slug, slugsBefore);
    if (!slugCheck.ok) {
      rejectReplenishOverwrite(slug, slugCheck.reason);
      return;
    }

    const topicCheck = validateReplenishTopicUnique(slug);
    if (!topicCheck.ok) {
      rejectReplenishOverwrite(slug, topicCheck.reason);
      return;
    }

    await ensureCoverImage(slug, request.topic);
    const issues = validateDraftPublishReady(slug);
    if (issues.length > 0) {
      removeReplenishSlugArtifacts(slug);
      recordReplenishFailure(
        `Integrity gate failed for ${slug}: ${issues.slice(0, 3).join(" | ")}`,
      );
      console.error(`Integrity gate failed for ${slug}`);
      return;
    }

    ensureDraftCreatedAt(slug, new Date().toISOString());

    const state = loadState();
    recordContentStrategy(state, {
      writingMode: request.writingMode ?? "stable",
      contentProfile: request.contentProfile,
      topicId: request.topic?.id,
      toneVariant: request.toneVariant,
      slug,
      keyword: request.serpKeyword,
      fallbackFrom: request.fallbackFrom,
      fallbackReason: request.fallbackReason,
    });
    saveState(state);

    console.log(
      `Content strategy recorded: mode=${request.writingMode ?? "stable"}, slug=${slug}`,
    );
  }

  const lastSlug = createdSlugs[createdSlugs.length - 1];
  const remaining = TARGET_DRAFT_COUNT - countDrafts();

  if (remaining <= 0) {
    completeCursorDraftRequest(lastSlug);
    console.log(
      `Replenish OK: buffer full ${countDrafts()}/${TARGET_DRAFT_COUNT} (wrote ${createdSlugs.join(", ")})`,
    );
    return;
  }

  await requeueCursorDraftReplenish(request.publishedSlug);
  console.log(
    `Partial replenish OK: ${createdSlugs.join(", ")} — buffer ${countDrafts()}/${TARGET_DRAFT_COUNT}, ${remaining} still queued`,
  );
}

main().catch((error) => {
  recordReplenishFailure(error.message);
  console.error(error.message);
  process.exit(1);
});
