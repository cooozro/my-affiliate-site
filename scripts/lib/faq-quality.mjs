/**
 * FAQ tone / template detection and validation (KO + EN).
 */

export const LEGACY_TEMPLATE_QUESTIONS_KO = [
  /구매 전 가장 먼저 확인할 항목은 무엇인가요/,
  /최저가 모델을 고르면 손해인가요/,
  /리뷰 평점만 믿어도 될까요/,
];

export const LEGACY_TEMPLATE_QUESTIONS_EN = [
  /What should I verify first before buying/i,
  /Is the cheapest option always a bad deal/i,
  /Can I rely on star ratings alone/i,
];

/** Mechanical patterns from faq-from-content fallback — must be rewritten. */
export const MECHANICAL_FAQ_QUESTIONS_KO = [
  /어떤 사용자에게 가장 잘 맞나요/,
  /이 가이드 기준으로 맞나요/,
  /왜 구매 전에 꼭 봐야 하나요/,
  /체크리스트의 「.+」은 왜 구매 전/,
  /상황에서는 어떤 콘솔·제품 구성이 현실적인가요/,
  /최종 추천을 한 문장으로 요약하면/,
  /가장 흔한 실수는 무엇인가요/,
];

export const MECHANICAL_FAQ_QUESTIONS_EN = [
  /Who should choose .+ from this guide/i,
  /Which pick fits the ".+" scenario in this guide/i,
  /Why does the checklist stress ".+" before checkout/i,
  /What is the bottom-line recommendation in this guide/i,
  /What is the most common mistake when buying for/i,
];

export const MIN_FAQ_ANSWER_CHARS = {
  ko: 120,
  en: 220,
};

export function mechanicalFaqPatterns(locale) {
  const legacy =
    locale === "ko" ? LEGACY_TEMPLATE_QUESTIONS_KO : LEGACY_TEMPLATE_QUESTIONS_EN;
  const mechanical =
    locale === "ko" ? MECHANICAL_FAQ_QUESTIONS_KO : MECHANICAL_FAQ_QUESTIONS_EN;
  return [...legacy, ...mechanical];
}

export function isMechanicalFaqQuestion(question, locale) {
  const q = String(question ?? "").trim();
  if (!q) return true;
  return mechanicalFaqPatterns(locale).some((re) => re.test(q));
}

export function isMechanicalFaqSection(sectionText, locale) {
  if (!sectionText) return false;

  const questions = (sectionText.match(/^###\s+(.+)$/gm) ?? []).map((line) =>
    line.replace(/^###\s+/, "").trim(),
  );
  if (questions.length === 0) return false;

  const mechanicalCount = questions.filter((q) =>
    isMechanicalFaqQuestion(q, locale),
  ).length;

  if (mechanicalCount >= 1) return true;

  // Same sentence skeleton repeated
  const skeletons = questions.map((q) =>
    q
      .replace(/「[^」]+」/g, "「…」")
      .replace(/[A-Za-z0-9][A-Za-z0-9 .\-+()]+/g, "…")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const unique = new Set(skeletons);
  if (questions.length >= 2 && unique.size === 1) return true;

  return false;
}

export function validateFaqQuality(entries, locale, minCount) {
  if (!Array.isArray(entries) || entries.length < minCount) {
    return {
      ok: false,
      reason: `expected ≥${minCount} FAQs, got ${entries?.length ?? 0}`,
    };
  }

  const minAnswer = MIN_FAQ_ANSWER_CHARS[locale] ?? MIN_FAQ_ANSWER_CHARS.en;

  for (const entry of entries.slice(0, minCount)) {
    const q = String(entry?.q ?? "").trim();
    const a = String(entry?.a ?? "").trim();

    if (!q || q.length < 15) {
      return { ok: false, reason: "question too short or empty" };
    }
    if (!a || a.length < minAnswer) {
      return {
        ok: false,
        reason: `answer too short (${a.length} chars, need ≥${minAnswer})`,
      };
    }
    if (isMechanicalFaqQuestion(q, locale)) {
      return { ok: false, reason: `mechanical question: ${q.slice(0, 70)}` };
    }
    if (locale === "ko" && !/[?？]$/.test(q)) {
      return { ok: false, reason: "Korean question should end with ?" };
    }
    if (locale === "ko" && (a.match(/입니다\./g) ?? []).length >= 4 && a.length < 180) {
      return { ok: false, reason: "answer reads too stiff / bullet-like" };
    }
  }

  return { ok: true, entries: entries.slice(0, minCount) };
}

export function buildFaqLlmSystemPrompt(locale, minCount, profile) {
  const isKo = locale === "ko";

  const voice = isKo
    ? `질문: 이 제품·주제를 잘 모르는 초보자가 검색창이나 커뮤니티에 올릴 법한 자연스러운 말투(해요체/합니다체 혼용 가능, 딱딱한 매뉴얼 말투 금지).
답변: AI Pick & Report 편집팀이 독자에게 직접 설명하듯 **따뜻하고 쉬운 말투**. 비유·예시 1개, 왜 그런지, 실수하면 생기는 일까지 4~6문장. 스펙 나열만 하지 말 것.`
    : `Questions: natural beginner phrasing — curious, specific, not formulaic.
Answers: warm editorial voice (AI Pick & Report team). Plain language, one concrete example, 4–6 sentences. No spec dumps or affiliate tone.`;

  const forbidden = isKo
    ? `금지 질문 패턴 예: "○○은 어떤 사용자에게 가장 잘 맞나요?", "체크리스트의 ○○은 왜 구매 전에 꼭 봐야 하나요?", "이 가이드 기준으로 맞나요?"`
    : `Forbidden patterns: "Who should choose X from this guide?", "Why does the checklist stress X before checkout?", generic shopping templates.`;

  const profileHint = {
    "buying-guide": isKo
      ? "비교 글 — 용도·예산·책상/방 크기 같은 실제 고민 중심 질문."
      : "Buying guide — reader worries about budget, room, use case.",
    "head-to-head": isKo
      ? "1:1 비교 — A vs B 고민, 둘 중 뭘 사야 할지 모르는 질문."
      : "Head-to-head — A vs B dilemma questions.",
    "scenario-guide": isKo
      ? "시나리오 — 거실/침실/출퇴근 등 상황별 '우리 집엔 뭐가 나아요?' 질문."
      : "Scenario — situation-first questions.",
    checklist: isKo
      ? "체크리스트 — 항목 이름만 반복하지 말고, '이거 안 보면 뭐가 문제예요?' 식 생활 질문."
      : "Checklist — life-situation questions, not item-name templates.",
    explainer: isKo
      ? "개념 설명 — 용어·스펙이 처음인 사람의 '이게 뭐예요?' 질문."
      : "Explainer — jargon explained for newcomers.",
  }[profile] ?? "";

  return `You write FAQ sections for AI Pick & Report (independent tech buying guides).
Output strict JSON only: { "faqs": [ { "q": "...", "a": "..." } ] }

Write exactly ${minCount} FAQ pairs in ${isKo ? "Korean" : "English"}.
Content profile: ${profile}
${profileHint}

${voice}

${forbidden}

SEO: questions may include natural long-tail phrases readers search, but must NOT be keyword-stuffed or identical skeletons.
No ads, no affiliate CTAs, no seller API claims. Ground answers in the article excerpt only.`;
}

export function buildFaqLlmUserPrompt(input) {
  const { slug, locale, title, description, body, data, minCount } = input;
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : "";
  const excerpt = body
    .replace(/##\s*(Related guides|관련 가이드)[\s\S]*?(?=\n##\s|$)/gi, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 7500);

  const examples = locale === "ko"
    ? `좋은 질문 예 (모니터): "재택인데 27인치랑 울트라와이드 중 뭐가 덜 답답해요?"
좋은 질문 예 (에어컨): "원룸인데 창문형이랑 이동식 중 뭐가 설치 덜 귀찮아요?"
나쁜 질문 예: "Dell S2721DS는 어떤 사용자에게 가장 잘 맞나요?"`
    : `Good Q: "I'm new to monitors — is 1440p overkill for spreadsheets only?"
Bad Q: "Who should choose Dell S2721DS from this guide?"`;

  return `Slug: ${slug}
Title: ${title}
Description: ${description}
Tags: ${tags}

${examples}

Article excerpt:
---
${excerpt}
---

Generate ${minCount} unique beginner-friendly FAQs with warm, detailed editorial answers.`;
}
