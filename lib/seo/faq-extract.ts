/**
 * Extract FAQ Q&A pairs from markdown bodies for JSON-LD and audits.
 * Mirrors scripts/lib/faq-section.mjs section detection rules.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_HEADING_RE =
  /^##\s*(FAQ|자주 묻는 질문|Frequently [Aa]sked(?:\s+[Qq]uestions)?)\s*$/m;

const FAQ_QUESTION_RE = /^###\s+(.+)$/;

function stripMarkdownInline(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectAnswerLines(lines: string[], startIdx: number): string {
  const parts: string[] = [];
  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) break;
    if (line.trim() === "---") break;
    if (line.trim()) parts.push(line.trim());
  }
  return stripMarkdownInline(parts.join(" "));
}

export function findFaqSectionStart(body: string): number {
  const match = body.match(FAQ_HEADING_RE);
  return match?.index ?? -1;
}

export function extractFaqFromMarkdown(body: string): FaqItem[] {
  const sectionStart = findFaqSectionStart(body);
  if (sectionStart < 0) return [];

  const sectionText = body.slice(sectionStart);
  const nextH2 = sectionText.slice(1).search(/^##\s+/m);
  const faqBlock =
    nextH2 >= 0 ? sectionText.slice(0, nextH2 + 1) : sectionText;

  const lines = faqBlock.split("\n");
  const items: FaqItem[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const qMatch = lines[i].match(FAQ_QUESTION_RE);
    if (!qMatch) continue;

    const question = stripMarkdownInline(qMatch[1]);
    const answer = collectAnswerLines(lines, i + 1);
    if (!question || !answer) continue;

    items.push({ question, answer });
  }

  return items;
}

export function countFaqItems(body: string): number {
  return extractFaqFromMarkdown(body).length;
}
