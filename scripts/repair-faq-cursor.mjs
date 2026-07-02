#!/usr/bin/env node
/**
 * Batch FAQ rewrite via Cursor Agent (edits post files in repo).
 * Usage: node scripts/repair-faq-cursor.mjs
 */

import { scanTemplatedContentIssues } from "./lib/faq-section-audit.mjs";

function slugsFromMechanicalList(mechanicalFaq) {
  return [...new Set(mechanicalFaq.map((label) => label.split("/")[0]))].sort();
}

function buildBatchPrompt(slugs) {
  const fileList = slugs
    .flatMap((slug) => [`content/posts/${slug}/ko.md`, `content/posts/${slug}/en.md`])
    .join("\n- ");

  return `Rewrite FAQ sections for AI Pick & Report blog posts (Plan A — Cursor only).

Read first:
- scripts/lib/faq-quality.mjs (banned mechanical question patterns)
- docs/CONTENT_STANDARDS.md

For EACH file below that has a mechanical/template FAQ, replace ONLY the FAQ section:
- KO: ## 자주 묻는 질문
- EN: ## FAQ

Rules:
- Questions: beginner-curious, natural (not "어떤 사용자에게 가장 잘 맞나요", not "체크리스트의 ○○은 왜", not "Who should choose X from this guide")
- Answers: warm AI Pick editorial voice, 4–6 sentences, one concrete example, grounded in that article
- Keep exactly 3 FAQ pairs (### headings) unless the post profile requires 5
- Do NOT change draft, publishedAt, date, title, or body outside the FAQ block
- Do NOT git commit

After editing each file, bump frontmatter updatedAt to current ISO time.

Files to fix:
- ${fileList}

When done, reply with a short JSON summary: { "edited": ["slug/locale", ...] }`;
}

async function main() {
  const root = process.cwd();
  const report = scanTemplatedContentIssues(root);
  const slugs = slugsFromMechanicalList([
    ...report.mechanicalFaq,
    ...report.templatedFaq,
  ]);

  if (slugs.length === 0) {
    console.log(JSON.stringify({ edited: [], message: "no mechanical FAQs found" }, null, 2));
    return;
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error("CURSOR_API_KEY is required");
    process.exit(1);
  }

  console.log(`Cursor batch FAQ repair: ${slugs.length} slug(s)`);

  const { Agent } = await import("@cursor/sdk");
  const result = await Agent.prompt(buildBatchPrompt(slugs), {
    apiKey,
    model: { id: process.env.CURSOR_FAQ_MODEL ?? "composer-2.5" },
    local: { cwd: root, settingSources: [] },
  });

  if (result.status === "error") {
    console.error(`Cursor agent failed: ${result.id ?? "unknown"}`);
    process.exit(1);
  }

  const after = scanTemplatedContentIssues(root);
  const remaining = after.mechanicalFaq.length + after.templatedFaq.length;

  console.log(
    JSON.stringify(
      {
        slugs,
        agentStatus: result.status,
        remainingMechanical: remaining,
        agentReply: String(result.result ?? "").slice(0, 500),
      },
      null,
      2,
    ),
  );

  if (remaining > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
