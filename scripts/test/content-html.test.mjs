/**
 * content-html helpers — cover hero / HTML extract
 * Run: node --test scripts/test/content-html.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyImageSrcs,
  extractRenderableHtml,
  looksLikeHtmlDocument,
  prepareHtmlDocument,
  shouldRenderCoverHero,
} from "../../lib/content-html.ts";

test("extracts article from full HTML document", () => {
  const full = `<!DOCTYPE html><html><body><article class="x"><p>hi</p><img src="/images/posts/a/b.jpg" /></article></body></html>`;
  assert.equal(looksLikeHtmlDocument(full), true);
  const extracted = extractRenderableHtml(full);
  assert.match(extracted, /^<article/);
  assert.doesNotMatch(extracted, /DOCTYPE|<\/html>/i);
  const prepared = prepareHtmlDocument(full);
  assert.match(prepared, /\/api\/media\/posts\/a\/b\.jpg/);
});

test("shouldRenderCoverHero hides when body already has same cover", () => {
  const body = `<img src="/images/posts/s/cover.jpg" alt="x" />`;
  assert.equal(
    shouldRenderCoverHero("/images/posts/s/cover.jpg", body),
    false,
  );
  assert.equal(
    shouldRenderCoverHero("/api/media/posts/s/cover.jpg", body),
    false,
  );
  assert.equal(
    shouldRenderCoverHero("/images/posts/s/other.jpg", body),
    true,
  );
});

test("bodyImageSrcs dedupes", () => {
  const html = `
    <img src="/images/posts/s/a.jpg" />
    <img src="/api/media/posts/s/a.jpg" />
    <img src="/images/posts/s/b.jpg" />
  `;
  assert.deepEqual(bodyImageSrcs(html), [
    "/images/posts/s/a.jpg",
    "/images/posts/s/b.jpg",
  ]);
});
