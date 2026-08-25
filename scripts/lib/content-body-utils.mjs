/**
 * Shared body parsers — markdown ## and HTML <h2> for admin HTML drafts.
 */

export function listH2Headings(body) {
  const md = (body.match(/^##\s+(.+)$/gm) ?? []).map((line) =>
    line.replace(/^##\s+/, "").trim(),
  );
  const html = (body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) ?? []).map((tag) =>
    tag.replace(/<[^>]+>/g, "").trim(),
  );
  return [...md, ...html].filter(Boolean);
}

export function countH2Sections(body) {
  return listH2Headings(body).length;
}

export function hasMarkdownOrHtmlSection(body, markdownRe, htmlLabelRe) {
  if (markdownRe.test(body)) return true;
  return htmlLabelRe.test(body);
}

export const METHODOLOGY_MARKDOWN_RE =
  /##\s*(분석 방법론|Analysis methodology|Methodology)/i;
export const METHODOLOGY_HTML_RE =
  /<h2[^>]*>\s*(분석 방법론|Analysis methodology|Methodology)\s*<\/h2>/i;

export const EDITORIAL_OVERVIEW_MARKDOWN_RE =
  /##\s*(Editorial Overview|편집부 개요)/i;
export const EDITORIAL_OVERVIEW_HTML_RE =
  /<h2[^>]*>\s*(Editorial Overview|편집부 개요)\s*<\/h2>/i;

export const FINAL_VERDICT_MARKDOWN_RE =
  /##\s*(Final Verdict|최종 평가)/i;
export const FINAL_VERDICT_HTML_RE =
  /<h2[^>]*>\s*(Final Verdict|최종 평가)\s*<\/h2>/i;

export const RELATED_GUIDES_MARKDOWN_RE = /##\s*(Related guides|관련 가이드)/i;
export const RELATED_GUIDES_HTML_RE =
  /<h2[^>]*>\s*(Related guides|관련 가이드)\s*<\/h2>/i;

export const FAQ_MARKDOWN_RE =
  /^##\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*$/m;
export const FAQ_HTML_RE =
  /<h2[^>]*>\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*<\/h2>/i;

export function hasMethodologySection(body) {
  return hasMarkdownOrHtmlSection(
    body,
    METHODOLOGY_MARKDOWN_RE,
    METHODOLOGY_HTML_RE,
  );
}

export function hasEditorialOverviewSection(body) {
  return hasMarkdownOrHtmlSection(
    body,
    EDITORIAL_OVERVIEW_MARKDOWN_RE,
    EDITORIAL_OVERVIEW_HTML_RE,
  );
}

export function hasFinalVerdictSection(body) {
  return hasMarkdownOrHtmlSection(
    body,
    FINAL_VERDICT_MARKDOWN_RE,
    FINAL_VERDICT_HTML_RE,
  );
}

export function hasRelatedGuidesSection(body) {
  return hasMarkdownOrHtmlSection(
    body,
    RELATED_GUIDES_MARKDOWN_RE,
    RELATED_GUIDES_HTML_RE,
  );
}

export function hasFaqHeading(body) {
  return hasMarkdownOrHtmlSection(body, FAQ_MARKDOWN_RE, FAQ_HTML_RE);
}

/** In-body pipeline images — markdown ![](/images/posts/...) or HTML <img src="/images/posts/..." alt="..."> */
export function countInBodyPostImages(body) {
  const md = (body.match(/!\[[^\]]*]\(\/images\/posts\/[^)]+\)/g) ?? []).length;
  const html = (
    body.match(/<img[^>]+src=["']\/images\/posts\/[^"']+["'][^>]*>/gi) ?? []
  ).filter((tag) => /alt=["'][^"']+["']/i.test(tag)).length;
  return md + html;
}

export function extractFaqSectionBounds(body) {
  const mdStart = body.search(FAQ_MARKDOWN_RE);
  const htmlStart = body.search(FAQ_HTML_RE);
  let start = -1;
  if (mdStart >= 0 && htmlStart >= 0) start = Math.min(mdStart, htmlStart);
  else start = Math.max(mdStart, htmlStart);
  if (start < 0) return null;

  const afterHeading = body.slice(start);
  const nextMd = afterHeading.slice(1).search(/^##\s+/m);
  const nextHtml = afterHeading.slice(1).search(/<h2[\s>]/i);
  let next = -1;
  if (nextMd >= 0 && nextHtml >= 0) next = Math.min(nextMd, nextHtml);
  else next = Math.max(nextMd, nextHtml);
  const end = next >= 0 ? start + 1 + next : body.length;
  return { start, end };
}
