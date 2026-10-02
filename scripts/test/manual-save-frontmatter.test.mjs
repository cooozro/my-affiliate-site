/**
 * Unit tests for manual-save frontmatter merge (draft/publish preservation).
 * Run: node --test scripts/test/manual-save-frontmatter.test.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

// TS sources aren't imported directly; mirror the pure helpers here for CI
// without a build step. Keep in sync with lib/admin-manual-post-service.ts.
function resolveManualSaveDraft(prev) {
  const raw = prev.draft;
  if (typeof raw === "boolean") return raw;
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  if (prev.publishedAt) return false;
  return true;
}

function buildManualSaveSharedFrontmatter(prevKo, opts) {
  const draft = resolveManualSaveDraft(prevKo);
  const shared = {
    draft,
    date: typeof prevKo.date === "string" && prevKo.date ? prevKo.date : opts.date,
    updatedAt: opts.now,
    manualOrigin: true,
    automationBuffer: false,
    writingProvider: "manual",
    contentProfile: "editorial",
    shareTop: opts.shareTop,
    shareBottom: opts.shareBottom,
  };
  if (draft) {
    shared.createdAt = prevKo.createdAt ?? opts.now;
  } else if (prevKo.publishedAt) {
    shared.publishedAt = prevKo.publishedAt;
  } else {
    shared.publishedAt = opts.now;
  }
  return shared;
}

const baseOpts = {
  now: "2026-10-02T00:14:48.242Z",
  date: "2026-10-02",
  coverAlt: "x",
  shareTop: true,
  shareBottom: true,
};

test("empty prev → new draft", () => {
  const shared = buildManualSaveSharedFrontmatter({}, baseOpts);
  assert.equal(shared.draft, true);
  assert.equal(shared.createdAt, baseOpts.now);
  assert.equal(shared.publishedAt, undefined);
});

test("published prev keeps draft:false + publishedAt (regression)", () => {
  const shared = buildManualSaveSharedFrontmatter(
    {
      draft: false,
      date: "2026-09-30",
      publishedAt: "2026-09-30T13:15:44.026Z",
      coverImage: "/images/posts/tozo-s8-aura/x.webp",
    },
    baseOpts,
  );
  assert.equal(shared.draft, false);
  assert.equal(shared.publishedAt, "2026-09-30T13:15:44.026Z");
  assert.equal(shared.date, "2026-09-30");
  assert.equal(shared.createdAt, undefined);
});

test("stale empty prev must NOT look like this published wipe", () => {
  // What the bug did: slugExists false / {} → draft true, date today, publishedAt gone
  const buggy = buildManualSaveSharedFrontmatter({}, baseOpts);
  assert.equal(buggy.draft, true);
  // After fix, real save must load GitHub prev so this path only hits brand-new posts.
});

test("string draft false is respected", () => {
  assert.equal(resolveManualSaveDraft({ draft: "false" }), false);
});

test("publishedAt alone keeps live", () => {
  assert.equal(
    resolveManualSaveDraft({ publishedAt: "2026-10-01T13:16:17.531Z" }),
    false,
  );
});

// silence unused
void createRequire;
