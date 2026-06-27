#!/usr/bin/env node
/**
 * PC-off draft replenish: runs Cursor agent on GitHub Actions (local runtime on runner).
 * Requires CURSOR_API_KEY in GitHub Secrets.
 */

import fs from "fs";
import path from "path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { fetchCoverImage } from "./fetch-image.mjs";
import { resolveImageContext, buildCoverAlt } from "../lib/image-query.mjs";
import {
  completeCursorDraftRequest,
  readCursorDraftRequest,
} from "./cursor-draft-request.mjs";
import {
  countDrafts,
  listDrafts,
  readPost,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import { TARGET_DRAFT_COUNT } from "../lib/publish-schedule.mjs";

import { getTemplatePath } from "../lib/content-profiles.mjs";

function buildPrompt(request) {
  const topic = request.topic ?? {};
  const contentProfile = request.contentProfile ?? "buying-guide";
  const templatePath = request.templatePath ?? getTemplatePath(contentProfile);

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
- Related guides section with /en/blog/ or /ko/blog/ internal links
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
      },
      content,
    );
  }
}

async function main() {
  const request = readCursorDraftRequest();
  if (!request || request.status !== "pending") {
    console.log("No pending cursor draft request — skip");
    return;
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "CURSOR_API_KEY missing — add GitHub Secret for PC-off draft replenish (Cursor Dashboard → Integrations).",
    );
    process.exit(1);
  }

  const draftsBefore = new Set(listDrafts().map((d) => d.slug));
  console.log(
    `Cursor replenish starting: topic=${request.topic?.id ?? "unknown"}, needed=${request.needed}`,
  );

  try {
    const result = await Agent.prompt(buildPrompt(request), {
      apiKey,
      model: { id: "composer-2.5" },
      local: { cwd: process.cwd(), settingSources: [] },
    });

    if (result.status === "error") {
      console.error(`Cursor agent run failed: ${result.id ?? "unknown"}`);
      process.exit(2);
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      console.error(`Cursor agent startup failed: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const updated = readCursorDraftRequest();
  let writtenSlug =
    typeof updated?.writtenSlug === "string" ? updated.writtenSlug : null;

  if (!writtenSlug) {
    const newDrafts = listDrafts().filter((d) => !draftsBefore.has(d.slug));
    writtenSlug = newDrafts[0]?.slug ?? null;
  }

  if (!writtenSlug) {
    console.error("Cursor agent finished but no new draft was detected.");
    process.exit(2);
  }

  await ensureCoverImage(writtenSlug, request.topic);

  const issues = validatePostFiles(writtenSlug);
  if (issues.length > 0) {
    console.error(`Validation failed for ${writtenSlug}:\n${issues.join("\n")}`);
    process.exit(2);
  }

  if (updated?.status !== "complete") {
    completeCursorDraftRequest(writtenSlug);
  }

  console.log(
    `Cursor replenish OK: ${writtenSlug} (buffer ${countDrafts()}/${TARGET_DRAFT_COUNT})`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
