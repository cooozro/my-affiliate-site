#!/usr/bin/env node
/**
 * PC-off draft replenish: runs Cursor agent on GitHub Actions (local runtime on runner).
 * Requires CURSOR_API_KEY in GitHub Secrets.
 */

import fs from "fs";
import path from "path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { fetchCoverImage } from "./fetch-image.mjs";
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

function buildPrompt(request) {
  const topic = request.topic ?? {};
  return `Replenish the blog draft buffer for AI Pick (Plan A — Cursor writes, no OpenAI).

Read first:
- docs/CONTENT_STANDARDS.md
- docs/BUYING_GUIDE_TEMPLATE.md
- scripts/lib/editorial-standards.mjs
- data/automation/cursor-draft-request.json

Write exactly ONE bilingual buying-guide draft:
- Files: content/posts/{slug}/en.md and ko.md
- Frontmatter: draft:true, contentProfile:buying-guide
- Topic id: ${topic.id ?? "see request file"}
- Category: ${topic.category ?? ""}
- Angle: ${topic.angle ?? ""}
- Suggested slug: 2026-budget-${topic.id ?? "topic"}-guide (unique, lowercase, hyphens only)
- liveData: ${topic.liveData ? "true — use {{today}}, {{today_locale}}, {{usd_krw_rate}}, {{krw:29.99}}" : "false"}

Content requirements (each locale):
- 2500+ characters
- Analysis methodology table (editorial sources only — no seller API claims)
- TOP 5 comparison table
- Scenario matrix
- Five checks before you buy
- Final Verdict with Who should buy / Who should skip tables (see BUYING_GUIDE_TEMPLATE.md)
- Conclusion section
- Varied title (avoid formulaic "2026 가성비 X TOP 5")

After writing posts:
1. Set data/automation/cursor-draft-request.json to status "complete" with writtenSlug and completedAt
2. Keep draft:true — do not publish
3. Do not git commit (CI commits)

Minimize scope. Only the one requested draft.`;
}

function coverFileExists(slug) {
  return fs.existsSync(
    path.join(process.cwd(), "public", "images", "posts", slug, "cover.jpg"),
  );
}

async function ensureCoverImage(slug, imageQuery) {
  if (coverFileExists(slug)) return;

  const meta = await fetchCoverImage(slug, imageQuery);
  if (!meta) return;

  for (const locale of ["en", "ko"]) {
    const postPath = path.join(process.cwd(), "content", "posts", slug, `${locale}.md`);
    if (!fs.existsSync(postPath)) continue;
    const { data, content } = readPost(slug, locale);
    writePost(slug, locale, { ...data, ...meta }, content);
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

  await ensureCoverImage(
    writtenSlug,
    request.topic?.imageQuery ?? request.topic?.id ?? "technology product",
  );

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
