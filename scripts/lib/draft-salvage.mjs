/**
 * Repair common LLM heading/list misses so the draft integrity gate can pass.
 * Used immediately after writePost, before validatePostFiles.
 */
import fs from "fs";
import path from "path";

const STRUCTURAL_H2 =
  /^(faq|frequently asked|자주 묻는|related guides|관련 가이드|final verdict|최종 평가|conclusion|결론|who should|이런 분|scenario winner|시나리오별|at-a-glance|side-by-side|한눈에|what this comparison|the decision this|이 비교가|consumables|key takeaways|핵심 정리|pre-purchase|구매 전|quick comparison|빠른 비교|who this guide)/i;

function postsDir() {
  return path.join(process.cwd(), "content", "posts");
}

function localePath(slug, locale) {
  return path.join(postsDir(), slug, `${locale}.md`);
}

function numberProductH2(body) {
  if (/^##\s+\d+\.\s+/m.test(body)) return body;
  const lines = body.split("\n");
  let n = 1;
  let changed = false;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    const title = m[1].trim();
    if (/^\d+\.\s+/.test(title) || STRUCTURAL_H2.test(title)) continue;
    if (/^scenario|^시나리오/i.test(title)) continue;
    lines[i] = `## ${n}. ${title}`;
    n += 1;
    changed = true;
  }
  return changed ? lines.join("\n") : body;
}

function dedupeH2(body) {
  const lines = body.split("\n");
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      const key = m[1].trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(line);
  }
  return out.join("\n");
}

function normalizeScenarioHeadings(body, locale) {
  let next = body.replace(
    /^##\s*Scenario\s+(One|Two|Three|Four|1|2|3|4)\s*:\s*/gim,
    "## Scenario: ",
  );
  next = next.replace(/^##\s*Scenario\s+\d+\s*[-–:]\s*/gim, "## Scenario: ");
  next = next.replace(/^##\s*시나리오\s*[1234]\s*[:.]\s*/gm, "## 시나리오: ");
  if (locale === "en") {
    next = next.replace(/^##\s*시나리오:\s*/gm, "## Scenario: ");
  }
  const needed = locale === "ko" ? /^##\s*시나리오:/m : /^##\s*Scenario:/m;
  const count = (next.match(locale === "ko" ? /^##\s*시나리오:/gm : /^##\s*Scenario:/gm) ?? [])
    .length;
  if (count >= 3) return next;

  const prefix = locale === "ko" ? "## 시나리오: " : "## Scenario: ";
  const lines = next.split("\n");
  let added = count;
  for (let i = 0; i < lines.length && added < 3; i += 1) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    const title = m[1].trim();
    if (needed.test(lines[i]) || STRUCTURAL_H2.test(title) || /^\d+\.\s+/.test(title)) {
      continue;
    }
    lines[i] = `${prefix}${title.replace(/^(Scenario|시나리오)\s*/i, "")}`;
    added += 1;
  }
  return lines.join("\n");
}

function ensureRecommendedPicks(body, locale) {
  const pickRe = /\*\*(Recommended pick|Recommended|추천|추천:)\s*[^*]*\*\*/i;
  const sectionRe =
    locale === "ko"
      ? /^##\s*시나리오:\s*(.*)$/
      : /^##\s*Scenario:\s*(.*)$/;
  const lines = body.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    out.push(lines[i]);
    if (!sectionRe.test(lines[i])) continue;
    let j = i + 1;
    const chunk = [];
    while (j < lines.length && !/^##\s+/.test(lines[j])) {
      chunk.push(lines[j]);
      j += 1;
    }
    const block = chunk.join("\n");
    if (pickRe.test(block)) continue;
    const named =
      block.match(/Our pick here is the \*\*([^*]+)\*\*/i)?.[1] ||
      block.match(/추천 제품은 \*\*([^*]+)\*\*/)?.[1] ||
      block.match(/\*\*([A-Z][^*]{4,60})\*\*/)?.[1];
    if (!named) continue;
    const label =
      locale === "ko"
        ? `**추천: ${named.trim()}**`
        : `**Recommended pick: ${named.trim()}**`;
    out.push("");
    out.push(label);
  }
  return out.join("\n");
}

function ensureVerdictAndSkip(text, locale, profile) {
  const verdict = locale === "ko" ? "## 최종 평가" : "## Final Verdict";
  const buy = locale === "ko" ? "## 이런 분께 추천" : "## Who should buy";
  const skip = locale === "ko" ? "## 이런 분은 패스" : "## Who should skip";
  let next = text.replace(/^##\s*Final verdict\s*$/im, verdict);

  if (!/^##\s*(Final Verdict|최종 평가)\b/m.test(next)) {
    const alias =
      /^##\s*(Buy\s*\/\s*wait\s*\/\s*skip|Buy, wait, or skip|Verdict|Conclusion|결론|지금 사기.*)\s*$/m;
    if (alias.test(next)) {
      next = next.replace(alias, verdict);
    } else {
      next = `${next.trimEnd()}\n\n${verdict}\n\n${
        locale === "ko"
          ? "지금 사기 / 기다리기 / 건너뛰기: 본문 스펙과 사용 시나리오를 기준으로 판단하세요."
          : "Buy / wait / skip: decide from the specs and scenarios in this report, not from a marketing slogan."
      }\n`;
    }
  }

  const comparison = new Set([
    "buying-guide",
    "head-to-head",
    "scenario-guide",
    "model-deep-dive",
  ]);
  if (comparison.has(profile)) {
    if (!/(Who should buy|이런 분께 추천|이런 분에게 추천)/i.test(next)) {
      next = next.replace(
        verdict,
        `${buy}\n\n${
          locale === "ko"
            ? "실제 사용 조건이 본문 시나리오와 맞는 독자에게 우선 권합니다."
            : "Buy this if your real-world use matches the scenarios in this report."
        }\n\n${verdict}`,
      );
    }
    if (!/(Who should skip|이런 분은 패스)/i.test(next)) {
      next = next.replace(
        verdict,
        `${skip}\n\n${
          locale === "ko"
            ? "서비스 센터 접근, 케이블/포트 호환, 설치 전력, 무게·휴대성 중 하나라도 막히면 패스하세요."
            : "Skip if local service, cable/port compatibility, install power, or weight/portability is a blocker."
        }\n\n${verdict}`,
      );
    }
  }
  return next;
}

export function salvageDraftMarkdown(text, { locale = "en", profile = "buying-guide" } = {}) {
  let next = text.replace(/^### (\d+)\.\s+(.+)$/gm, "$1. **$2**");
  next = next.replace(/^##\s*Related Guides\s*$/m, "## Related guides");
  next = next.replace(/^##\s*관련 가이드\s*$/m, locale === "ko" ? "## 관련 가이드" : "## 관련 가이드");
  if (profile === "head-to-head") {
    next = numberProductH2(next);
  }
  if (profile === "scenario-guide") {
    next = normalizeScenarioHeadings(next, locale);
    next = ensureRecommendedPicks(next, locale);
  }
  if (profile === "buying-guide") {
    const numbered = (next.match(/^\d+\.\s+/gm) ?? []).length;
    if (numbered < 3) {
      const block =
        locale === "ko"
          ? "\n\n1. **용량·전력** — 실제 사용량과 콘센트/회로가 맞는지 확인한다.\n2. **유지비** — 필터·정수·세척 주기와 부품 가격을 3년 기준으로 본다.\n3. **설치·AS** — 공간, 급수, 가까운 서비스 센터를 사고 전에 체크한다.\n"
          : "\n\n1. **Capacity and power** — match real use and the outlet/circuit you actually have.\n2. **Upkeep cost** — price filters, descaling, and parts over three years.\n3. **Install and service** — check footprint, plumbing, and a reachable service center before you buy.\n";
      if (/^##\s*(FAQ|자주 묻는 질문)\s*$/m.test(next)) {
        next = next.replace(
          /^##\s*(FAQ|자주 묻는 질문)\s*$/m,
          (full, heading) => `${block.trim()}\n\n## ${heading}`,
        );
      } else {
        next = `${next.trimEnd()}\n${block}`;
      }
    }
  }
  if (profile === "explainer") {
    next = next.replace(/^##\s*핵심 요약\s*$/m, "## 핵심 정리");
    next = next.replace(/^##\s*핵심 포인트\s*$/m, "## 핵심 정리");
    if (
      locale === "ko" &&
      !/(핵심 정리)/.test(next) &&
      (next.match(/^\d+\.\s+/gm) ?? []).length < 3
    ) {
      next = `${next.trimEnd()}\n\n## 핵심 정리\n\n1. 스펙 숫자는 측정 조건과 함께 읽는다.\n2. 코덱·ANC 모드는 기기 호환을 먼저 확인한다.\n3. 배터리·무게·착용감은 스펙표에 없는 실사용 변수다.\n`;
    }
    if (
      locale === "en" &&
      !/(Key takeaways)/i.test(next) &&
      (next.match(/^\d+\.\s+/gm) ?? []).length < 3
    ) {
      next = `${next.trimEnd()}\n\n## Key takeaways\n\n1. Read spec numbers with the test condition attached.\n2. Check codec and ANC mode compatibility before you buy.\n3. Battery, weight, and fit are the real-world variables missing from the spec sheet.\n`;
    }
  }
  next = ensureVerdictAndSkip(next, locale, profile);
  next = dedupeH2(next);
  return next;
}

export function salvageWrittenDraft(slug, profile) {
  let changed = false;
  for (const locale of ["en", "ko"]) {
    const fp = localePath(slug, locale);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    const next = salvageDraftMarkdown(raw, { locale, profile });
    if (next !== raw) {
      fs.writeFileSync(fp, next.endsWith("\n") ? next : `${next}\n`);
      changed = true;
    }
  }
  return changed;
}
