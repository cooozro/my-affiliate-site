import type { Locale } from "@/lib/i18n/config";

const SECTION_HEADINGS: Record<
  Locale,
  { overview: RegExp; verdict: RegExp; overviewTitle: string; verdictTitle: string }
> = {
  en: {
    overview: /^##\s*Editorial Overview\s*$/im,
    verdict: /^##\s*Final Verdict\s*$/im,
    overviewTitle: "Editorial Overview",
    verdictTitle: "Final Verdict",
  },
  ko: {
    overview: /^##\s*편집부 개요\s*$/im,
    verdict: /^##\s*최종 평가\s*$/im,
    overviewTitle: "편집부 개요",
    verdictTitle: "최종 평가",
  },
};

function extractSection(content: string, headingPattern: RegExp): string {
  const lines = content.split("\n");
  let start = -1;

  for (let i = 0; i < lines.length; i++) {
    if (headingPattern.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }

  if (start === -1) return "";

  const collected: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownSnippetToHtml(snippet: string, maxChars = 1200): string {
  let text = snippet
    .replace(/^>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^---$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars).trim()}…`;
  }

  return text
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("\n");
}

export function buildFeedItemHtml(
  content: string,
  locale: Locale,
  description: string,
): string {
  const headings = SECTION_HEADINGS[locale];
  const overview = extractSection(content, headings.overview);
  const verdict = extractSection(content, headings.verdict);

  const parts: string[] = [];

  if (overview) {
    parts.push(
      `<h2>${escapeHtml(headings.overviewTitle)}</h2>`,
      markdownSnippetToHtml(overview, 900),
    );
  } else if (description) {
    parts.push(`<p>${escapeHtml(description)}</p>`);
  }

  if (verdict) {
    parts.push(
      `<h2>${escapeHtml(headings.verdictTitle)}</h2>`,
      markdownSnippetToHtml(verdict, 900),
    );
  }

  return parts.join("\n");
}

export function buildFeedPlainSummary(
  content: string,
  locale: Locale,
  description: string,
): string {
  const headings = SECTION_HEADINGS[locale];
  const overview = extractSection(content, headings.overview);
  const verdict = extractSection(content, headings.verdict);

  const chunks = [overview, verdict].filter(Boolean);
  if (chunks.length === 0) return description;

  const combined = chunks
    .join(" ")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (combined.length <= 320) return combined;
  return `${combined.slice(0, 317).trim()}…`;
}
