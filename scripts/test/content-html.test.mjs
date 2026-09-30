/**
 * Run: node --experimental-strip-types scripts/test/content-html.test.mjs
 * (or after build transpile — pure JS reimplementation for Node without TS loader)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Mirror lib/content-html.ts for offline Node test without Next TS pipeline.
const HTML_ROOT_RE =
  /^<(?:article|section|div|main|aside|header|body|html)\b/i;

function looksLikeHtmlDocument(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<")) return false;
  if (HTML_ROOT_RE.test(trimmed)) return true;
  const openTags = trimmed.match(/<[a-zA-Z][^>]*>/g)?.length ?? 0;
  const closeTags = trimmed.match(/<\/[a-zA-Z]+>/g)?.length ?? 0;
  return openTags >= 3 && closeTags >= 2;
}

function dedentIndentedHtmlTags(content) {
  return content.replace(/^(?: {4,}|\t+)(?=<\/?[a-zA-Z!])/gm, "");
}

function rewritePostMediaSrc(html) {
  return html.replace(
    /(\bsrc=(["']))\/images\/posts\//gi,
    "$1/api/media/posts/",
  );
}

const koPath = path.join("content/posts/tozo-s8-aura/ko.md");
const raw = fs.readFileSync(koPath, "utf8");
const body = raw.split(/^---$/m).slice(2).join("---").replace(/^\n/, "");

assert.equal(looksLikeHtmlDocument(body), true);
assert.equal(looksLikeHtmlDocument("# Hello\n\nParagraph"), false);
assert.equal(
  looksLikeHtmlDocument("<p>one</p>\n<p>two</p>\n<p>three</p>"),
  true,
);

const indented = "    <div class=\"table-responsive-wrapper\">\n    <table></table>\n    </div>";
const dedented = dedentIndentedHtmlTags(indented);
assert.ok(dedented.startsWith("<div"));
assert.equal(dedented.includes("\n<table"), true);

const rewritten = rewritePostMediaSrc(
  '<img src="/images/posts/tozo-s8-aura/x.webp" alt="x" />',
);
assert.equal(
  rewritten,
  '<img src="/api/media/posts/tozo-s8-aura/x.webp" alt="x" />',
);

function normalizePostImageSrc(src) {
  return src.trim().replace(/\/api\/media\/posts\//, "/images/posts/");
}
function firstBodyImageSrc(content) {
  const m = content.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  const src = m?.[1]?.trim();
  if (!src) return undefined;
  return normalizePostImageSrc(src);
}
function shouldRenderCoverHero(coverImage, bodyHtml) {
  if (!coverImage) return false;
  const cover = normalizePostImageSrc(coverImage);
  const bodyFirst = firstBodyImageSrc(bodyHtml);
  if (bodyFirst && cover === bodyFirst) return false;
  return true;
}

assert.equal(
  shouldRenderCoverHero(
    "/images/posts/tozo-s8-aura/TOZOS8Aura.webp",
    '<p>x</p><img src="/images/posts/tozo-s8-aura/TOZOS8Aura.webp" />',
  ),
  false,
);
assert.equal(
  shouldRenderCoverHero(
    "/images/posts/tozo-s8-aura/cover.webp",
    '<p>x</p><img src="/images/posts/tozo-s8-aura/TOZOS8Aura.webp" />',
  ),
  true,
);
assert.equal(shouldRenderCoverHero("", "<img src='/images/posts/a/b.webp' />"), false);

// Real TOZO body must be treated as HTML doc (fixes preview table escape).
assert.ok(body.includes("<table"));
assert.ok(looksLikeHtmlDocument(body));
assert.equal(
  shouldRenderCoverHero(
    "/images/posts/tozo-s8-aura/TOZOS8Aura.webp",
    body,
  ),
  false,
);

console.log("content-html.test.mjs: ok");
void createRequire;
