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

test("keeps later sections when translator inserts early </article></body></html>", () => {
  const broken = `<!DOCTYPE html><html><body>
<article class="x">
<section><h2>1. One</h2><p>a</p></section>
</article>
</body>
</html></ul>
</section>
<section><h2>2. Two</h2><p>b</p></section>
<section><h2>8. End</h2><p>c</p></section>
</article>
</body></html>`;
  const extracted = extractRenderableHtml(broken);
  assert.match(extracted, /2\. Two/);
  assert.match(extracted, /8\. End/);
  assert.equal((extracted.match(/<\/article>/gi) || []).length, 1);
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
