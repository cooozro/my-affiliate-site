/**
 * Manual posts often paste full HTML (<article>…</article>) with indented tags.
 * remark treats 4+ space indents as code fences, so tables/tags show as raw text.
 */

const HTML_ROOT_RE =
  /^<(?:article|section|div|main|aside|header|body|html)\b/i;

export function looksLikeHtmlDocument(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<")) return false;
  if (HTML_ROOT_RE.test(trimmed)) return true;
  const openTags = trimmed.match(/<[a-zA-Z][^>]*>/g)?.length ?? 0;
  const closeTags = trimmed.match(/<\/[a-zA-Z]+>/g)?.length ?? 0;
  return openTags >= 3 && closeTags >= 2;
}

/** Keep markdown from treating indented HTML tags as fenced/indented code. */
export function dedentIndentedHtmlTags(content: string): string {
  return content.replace(/^(?: {4,}|\t+)(?=<\/?[a-zA-Z!])/gm, "");
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
  return rewritePostMediaSrc(stripDangerousHtml(content.trim()));
}
