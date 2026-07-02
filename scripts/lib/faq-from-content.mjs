/**
 * Post-specific FAQ from article structure (fallback when OPENAI_API_KEY is absent).
 * Avoids generic template questions — derives from headings, scenarios, checklist items.
 */

const SCENARIO_RE = /^##\s*(Scenario:\s*|시나리오:\s*)(.+)$/gm;
const PRODUCT_RE = /^##\s*(\d+)\.\s+(.+)$/gm;
const CHECKLIST_ITEM_RE = /^\d+\.\s+\*\*(.+?)\*\*/gm;

function cleanHeading(text) {
  return String(text ?? "")
    .replace(/\*\*/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionExcerpt(body, startIndex, maxLen = 280) {
  const slice = body.slice(startIndex, startIndex + 1400);
  const lines = slice.split("\n").slice(1);
  const parts = [];
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) || line.trim() === "---") break;
    if (line.trim()) parts.push(line.trim());
    if (parts.join(" ").length > maxLen) break;
  }
  return parts
    .join(" ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .slice(0, maxLen)
    .trim();
}

function verdictParagraph(body, locale) {
  const pattern =
    locale === "ko"
      ? /##\s*(최종 평가|결론)[\s\S]*?(?=\n##\s|$)/
      : /##\s*(Final Verdict|Conclusion)[\s\S]*?(?=\n##\s|$)/i;
  const match = body.match(pattern);
  if (!match) return "";
  return match[0]
    .replace(/^##[^\n]*\n/, "")
    .replace(/\n/g, " ")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

function buildFromScenarios(body, locale, minCount) {
  const entries = [];
  for (const match of body.matchAll(SCENARIO_RE)) {
    const title = cleanHeading(match[2]);
    if (!title) continue;
    const sectionStart = match.index ?? 0;
    const section = body.slice(sectionStart, sectionStart + 1200);
    const answer = section
      .split("\n")
      .slice(2, 8)
      .join(" ")
      .replace(/[*_`\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 260);

    if (locale === "ko") {
      entries.push({
        q: `「${title}」에는 어떤 모델·구성이 이 가이드 기준으로 맞나요?`,
        a: answer || `본문의 「${title}」 시나리오 절과 비교 표, 최종 평가를 함께 확인하세요.`,
      });
    } else {
      entries.push({
        q: `Which pick fits the "${title}" scenario in this guide?`,
        a: answer || `See the scenario section, comparison table, and Final Verdict for ${title}.`,
      });
    }
    if (entries.length >= minCount) break;
  }
  return entries;
}

function buildFromProducts(body, locale, minCount) {
  const entries = [];
  for (const match of body.matchAll(PRODUCT_RE)) {
    const name = cleanHeading(match[2]);
    if (!name || /Comparison|Table|Methodology|Overview|Verdict|FAQ|Related/i.test(name)) {
      continue;
    }
    const sectionStart = match.index ?? 0;
    const answer = sectionExcerpt(body, sectionStart);
    if (locale === "ko") {
      entries.push({
        q: `${name}은 어떤 사용자에게 가장 잘 맞나요?`,
        a: answer || `본문의 ${name} 섹션 강점·약점과 최종 평가 표를 참고하세요.`,
      });
    } else {
      entries.push({
        q: `Who should choose ${name} from this guide?`,
        a: answer || `See the strengths, weaknesses, and verdict notes for ${name} in the body.`,
      });
    }
    if (entries.length >= minCount) break;
  }
  return entries;
}

function buildFromChecklist(body, locale, minCount) {
  const entries = [];
  for (const match of body.matchAll(CHECKLIST_ITEM_RE)) {
    const item = cleanHeading(match[1]);
    if (!item) continue;
    if (locale === "ko") {
      entries.push({
        q: `체크리스트의 「${item}」은 왜 구매 전에 꼭 봐야 하나요?`,
        a: `이 항목을 건너뛰면 설치·성능·반품 리스크가 커질 수 있습니다. 본문 해당 번호 항목의 이유·주의 신호를 확인하세요.`,
      });
    } else {
      entries.push({
        q: `Why does the checklist stress "${item}" before checkout?`,
        a: `Skipping this check often leads to install or performance surprises. Read the Why and Red flag notes for this item in the body.`,
      });
    }
    if (entries.length >= minCount) break;
  }
  return entries;
}

function buildVerdictFaq(body, locale) {
  const v = verdictParagraph(body, locale);
  if (!v) return null;
  if (locale === "ko") {
    return {
      q: "이 글의 최종 추천을 한 문장으로 요약하면?",
      a: v,
    };
  }
  return {
    q: "What is the bottom-line recommendation in this guide?",
    a: v,
  };
}

/**
 * @returns {Array<{ q: string, a: string }>}
 */
export function generateFaqFromArticleContent(input) {
  const { locale, body, data } = input;
  const minCount = input.minCount ?? 3;
  const profile = data.contentProfile ?? "buying-guide";
  const entries = [];

  if (profile === "scenario-guide") {
    entries.push(...buildFromScenarios(body, locale, minCount));
  } else if (profile === "head-to-head" || profile === "buying-guide") {
    entries.push(...buildFromProducts(body, locale, minCount));
  } else if (profile === "checklist") {
    entries.push(...buildFromChecklist(body, locale, minCount));
  }

  const verdict = buildVerdictFaq(body, locale);
  if (verdict && !entries.some((e) => e.q === verdict.q)) {
    entries.push(verdict);
  }

  if (entries.length < minCount) {
    entries.push(...buildFromProducts(body, locale, minCount));
  }
  if (entries.length < minCount) {
    entries.push(...buildFromScenarios(body, locale, minCount));
  }

  const title = cleanHeading(data.title ?? "");
  if (entries.length < minCount && title) {
    if (locale === "ko") {
      entries.push({
        q: `「${title}」에서 가장 흔한 실수는 무엇인가요?`,
        a: "스펙만 보고 설치·사용 환경을 생략하는 경우입니다. 본문 비교 표와 시나리오·단점 문단을 구매 전에 다시 읽어 보세요.",
      });
    } else {
      entries.push({
        q: `What is the most common mistake when buying for "${title}"?`,
        a: "Choosing on specs alone without matching install constraints and daily use. Re-read comparison tables and weakness bullets before checkout.",
      });
    }
  }

  return entries.slice(0, minCount);
}
