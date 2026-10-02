/**
 * Smoke: public raw GitHub read for EN post used by /en/blog/[slug].
 * Run: node --test scripts/test/github-public-read.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import matter from "gray-matter";

const EN_URL =
  "https://raw.githubusercontent.com/cooozro/my-affiliate-site/main/content/posts/tozo-s8-aura/en.md";

test("tozo-s8-aura EN markdown is publicly readable and published", async () => {
  const res = await fetch(EN_URL, { headers: { Accept: "text/plain" } });
  assert.equal(res.status, 200);
  const raw = await res.text();
  const parsed = matter(raw);
  assert.equal(parsed.data.draft, false);
  assert.ok(String(parsed.data.title).includes("TOZO S8 Aura"));
  assert.ok(parsed.content.includes("<article"));
});
