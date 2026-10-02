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
 *
 * Translators sometimes inject a premature </article></body></html> mid-body
 * (seen on EN manual posts). Use the outermost article span and strip those
 * false document closers so later sections are not dropped.
 */
export function extractRenderableHtml(content: string): string {
  const trimmed = content.trim();
  const open = /<article\b[^>]*>/i.exec(trimmed);
  if (open && open.index !== undefined) {
    const start = open.index;
    const closes = [...trimmed.matchAll(/<\/article>/gi)];
    if (closes.length > 0) {
      const last = closes[closes.length - 1];
      const end = (last.index ?? start) + last[0].length;
      let chunk = trimmed.slice(start, end);
      // Remove early document/article closers that still leave more article body.
      chunk = chunk.replace(
        /<\/article>\s*<\/body>\s*<\/html>(?:\s*<\/ul>)?(?:\s*<\/section>)?(?=[\s\S]*<\/article>)/gi,
        "",
      );
      // If multiple </article> remain, keep only the final closer.
      const innerCloses = [...chunk.matchAll(/<\/article>/gi)];
      if (innerCloses.length > 1) {
        for (let i = 0; i < innerCloses.length - 1; i += 1) {
          const m = innerCloses[i];
          if (m.index === undefined) continue;
          chunk =
            chunk.slice(0, m.index) + chunk.slice(m.index + m[0].length);
        }
      }
      return chunk.trim();
    }
  }
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
