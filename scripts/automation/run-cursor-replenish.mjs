#!/usr/bin/env node
/**
 * Draft replenish on GitHub Actions (Plan A).
 * Uses Cursor SDK when CURSOR_API_KEY is set. OpenAI is optional fallback only.
 */

import fs from "fs";
import path from "path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { fetchCoverImage } from "./fetch-image.mjs";
import { resolveImageContext, buildCoverAlt } from "../lib/image-query.mjs";
import {
  completeCursorDraftRequest,
  readCursorDraftRequest,
  recordReplenishAttempt,
  recordReplenishFailure,
  requeueCursorDraftReplenish,
} from "./cursor-draft-request.mjs";
import { generateDraftFromRequest } from "./generate-draft.mjs";
import { pickTopic } from "./topics.mjs";
import { loadState, saveState } from "./state.mjs";
import {
  countDrafts,
  listDrafts,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";
import { getTemplatePath } from "../lib/content-profiles.mjs";
import { listPublishedSlugs } from "../lib/content-quality.mjs";

function buildCursorPrompt(request) {
  const topic = request.topic ?? {};
  const contentProfile = request.contentProfile ?? "buying-guide";
  const templatePath = request.templatePath ?? getTemplatePath(contentProfile);
  const publishedSlugs = [...listPublishedSlugs(process.cwd())].sort().join(", ");

  return `Replenish the blog draft buffer for AI Pick (Plan A — Cursor writes, no OpenAI).

Read first:
- docs/CONTENT_STANDARDS.md
- ${templatePath}
- scripts/lib/editorial-standards.mjs
- data/automation/cursor-draft-request.json

Write exactly ONE bilingual draft:
- Files: content/posts/{slug}/en.md and ko.md
- Frontmatter: draft:true, contentProfile:${contentProfile}
- Topic id: ${topic.id ?? "see request file"}
- Category: ${topic.category ?? ""}
- Angle: ${topic.angle ?? ""}
- Season priority: ${request.season ?? "current KST season"}${request.seasonalEvents?.length ? ` (${request.seasonalEvents.join(", ")})` : ""}
- Suggested slug: 2026-${topic.id ?? "topic"}-guide (unique, lowercase, hyphens only)
- liveData: ${topic.liveData ? "true — use {{today}}, {{today_locale}}, {{usd_krw_rate}}, {{krw:29.99}}" : "false"}

Follow ${templatePath} for section structure.

Content requirements (each locale):
- Meet minimum length for profile ${contentProfile}
- Analysis methodology table (editorial sources only — no seller API claims)
- Related guides section with /en/blog/ or /ko/blog/ internal links — **only** these published slugs: ${publishedSlugs}
- Varied title (avoid formulaic "2026 가성비 X TOP 5")

After writing posts:
1. Set data/automation/cursor-draft-request.json to status "complete" with writtenSlug and completedAt
2. Keep draft:true — do not publish
3. Do not git commit (CI commits)

Minimize scope. Only the one requested draft.`;
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
        coverImageAlt: buildCoverAlt(locale === "ko" ? "ko" : "en", {
          ...imageContext,
          title: postData.title,
        }),
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
    `Cursor replenish starting: topic=${request.topic?.id ?? "unknown"}, needed=${request.needed}`,
  );

  console.log(`Node ${process.version} (Cursor local agent needs >= 22.13 for node:sqlite)`);

  const result = await Agent.prompt(buildCursorPrompt(request), {
    apiKey,
    model: { id: "composer-2.5" },
    local: { cwd: process.cwd(), settingSources: [] },
  });

  if (result.status === "error") {
    throw new Error(`Cursor agent run failed: ${result.id ?? "unknown"}`);
  }

  const updated = readCursorDraftRequest();
  let writtenSlug =
    typeof updated?.writtenSlug === "string" ? updated.writtenSlug : null;

  if (!writtenSlug) {
    const newDrafts = listDrafts().filter((d) => !draftsBefore.has(d.slug));
    writtenSlug = newDrafts[0]?.slug ?? null;
  }

  return writtenSlug;
}

async function main() {
  const request = readCursorDraftRequest();
  if (!request || request.status !== "pending") {
    console.log("No pending cursor draft request — skip");
    return;
  }

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
  const createdSlugs = [];

  try {
    if (cursorKey) {
      const slug = await replenishWithCursor(request, draftsBefore);
      if (slug) createdSlugs.push(slug);
    } else if (openaiKey) {
      createdSlugs.push(...(await replenishWithOpenAI(request)));
    }
  } catch (error) {
    const message =
      error instanceof CursorAgentError
        ? `Cursor agent: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);

    if (cursorKey && openaiKey && createdSlugs.length === 0) {
      console.warn(`Cursor replenish failed, trying OpenAI fallback: ${message}`);
      try {
        createdSlugs.push(...(await replenishWithOpenAI(request)));
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        recordReplenishFailure(`${message} | OpenAI fallback: ${fallbackMessage}`);
        process.exit(2);
      }
    } else {
      recordReplenishFailure(message);
      console.error(message);
      // Exit 0 so publish/validate steps still run; pending request retries on next cron.
      return;
    }
  }

  if (createdSlugs.length === 0) {
    const message = "Replenish finished but no new draft was created.";
    recordReplenishFailure(message);
    console.error(message);
    return;
  }

  for (const slug of createdSlugs) {
    await ensureCoverImage(slug, request.topic);
    const issues = validatePostFiles(slug, {
      phase: "draft",
      applyRepair: true,
    });
    if (issues.length > 0) {
      recordReplenishFailure(
        `Integrity gate failed for ${slug}: ${issues.slice(0, 3).join(" | ")}`,
      );
      console.error(`Integrity gate failed for ${slug}`);
      return;
    }
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

  requeueCursorDraftReplenish(request.publishedSlug);
  console.log(
    `Partial replenish OK: ${createdSlugs.join(", ")} — buffer ${countDrafts()}/${TARGET_DRAFT_COUNT}, ${remaining} still queued`,
  );
}

main().catch((error) => {
  recordReplenishFailure(error.message);
  console.error(error.message);
  process.exit(1);
});
