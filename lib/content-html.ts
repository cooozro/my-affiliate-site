/**
 * Manual posts often paste full HTML (<article>…</article>) with indented tags.
 * remark treats 4+ space indents as code fences, so tables/tags show as raw text.
 */

const HTML_ROOT_RE =
  /^<(?:article|section|div|main|aside|header|body|html)\b/i;

export function looksLikeHtmlDocument(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<")) return false;
  if (/^<!doctype\s+html/i.test(trimmed)) return true;
  if (HTML_ROOT_RE.test(trimmed)) return true;
  const openTags = trimmed.match(/<[a-zA-Z][^>]*>/g)?.length ?? 0;
  const closeTags = trimmed.match(/<\/[a-zA-Z]+>/g)?.length ?? 0;
  return openTags >= 3 && closeTags >= 2;
}

/** Keep markdown from treating indented HTML tags as fenced/indented code. */
export function dedentIndentedHtmlTags(content: string): string {
  return content.replace(/^(?: {4,}|\t+)(?=<\/?[a-zA-Z!])/gm, "");
}

/**
 * Full pasted HTML documents nest <html>/<body> inside our layout and can
 * confuse the browser (duplicate chrome / odd image remounts). Prefer the
 * inner <article>, else <body> children.
 */
export function extractRenderableHtml(content: string): string {
  const trimmed = content.trim();
  const article = trimmed.match(/<article\b[^>]*>[\s\S]*?<\/article>/i);
  if (article) return article[0].trim();
  const body = trimmed.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (body?.[1]) return body[1].trim();
  return trimmed;
}

export function rewritePostMediaSrc(html: string): string {
  return html.replace(
    /(\bsrc=(["']))\/images\/posts\//gi,
    "$1/api/media/posts/",
  );
}

/** Admin/manual HTML is trusted; still strip obvious script vectors. */
export function stripDangerousHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?iframe\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"])[\s\S]*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
}

export function prepareHtmlDocument(content: string): string {
  return rewritePostMediaSrc(
    stripDangerousHtml(extractRenderableHtml(content)),
  );
}

export function normalizePostImageSrc(src: string): string {
  return src.trim().replace(/\/api\/media\/posts\//, "/images/posts/");
}

export function bodyImageSrcs(content: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
  )) {
    const src = normalizePostImageSrc(match[1]?.trim() ?? "");
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

export function firstBodyImageSrc(content: string): string | undefined {
  return bodyImageSrcs(content)[0];
}

/** Keep list/OG cover; hide article hero when body already shows the same file. */
export function shouldRenderCoverHero(
  coverImage: string | undefined | null,
  bodyHtml: string,
): boolean {
  if (!coverImage) return false;
  const cover = normalizePostImageSrc(coverImage);
  if (!cover) return false;
  const bodySrcs = bodyImageSrcs(bodyHtml);
  // Same asset already in the body → avoid stacked duplicate hero.
  if (bodySrcs.includes(cover)) return false;
  // Filename-only match (path slug typos / moved folders).
  const coverFile = cover.split("/").pop();
  if (
    coverFile &&
    bodySrcs.some((src) => src.split("/").pop() === coverFile)
  ) {
    return false;
  }
  return true;
}
