# Buying Guide — Professional Review Format

Use this structure for every **buying-guide** post (`contentProfile: buying-guide`). Required for AdSense-quality E-E-A-T reviews.

## Section order

1. **Editor's Note** / **에디터 노트** — first `##` heading in body (right below title in frontmatter)
2. **Introduction** / **서론**
3. **Analysis methodology** / **분석 방법론**
4. **TOP 5 comparison table**
5. **Product sections** (`## 1. Model name`) — one per pick
6. **Scenario matrix**
7. **Five checks before you buy** (numbered list, ≥3 items)
8. **Final Verdict** / **최종 평가** — not a thin summary; include Who should buy / Who should skip tables

---

## Editor's Note (required)

2–3 sentences. First person, operator insight. Explain **why** this category was analyzed and one honest observation from cross-checking public data.

**EN example:**

```markdown
## Editor's Note

> As someone who has compared hundreds of power-bank spec sheets for this site, I kept seeing shoppers chase mAh labels while airlines and fast-charge limits really depend on **watt-hours and PD output**. I wrote this guide to turn those dry numbers into carry decisions you can trust—not brand hype.
```

**KO example:**

```markdown
## 에디터 노트

> 수백 개의 보조배터리 스펙시트를 교차 검증하다 보니, 많은 분이 mAh 숫자만 보고 고르시더군요. 실제로는 **Wh(와트시)와 PD 와트**가 비행기 휴대와 충전 속도를 좌우합니다. 이 글은 마케팅 문구가 아닌, 검증 가능한 수치로 선택을 돕기 위해 썼습니다.
```

---

## Product section (each H2)

After **Strengths** / **Weaknesses**, add one line:

| EN | KO |
| --- | --- |
| `**Practical insight:** For the average user, this translates to…` | `**실사용 인사이트:** 일반 사용자 입장에서는 이렇게 체감됩니다.…` |

Tone: informative, trustworthy, helpful—not salesy. Tie specs to daily life.

---

## Final Verdict (required)

Replace a one-paragraph-only conclusion with:

```markdown
## Final Verdict

[1–2 sentences: overall market takeaway in friendly, confident tone]

### Who should buy?

| Model | Buy if you… |
| --- | --- |
| **Model A** | … |
| **Model B** | … |

### Who should skip?

| Model | Skip if you… |
| --- | --- |
| **Model A** | … |
| **Model C** | … |

[Optional closing line: remind reader to match use case before checkout; use {{today}} placeholders if liveData]
```

Korean headings: `## 최종 평가`, `### 이런 분께 추천`, `### 이런 분은 패스`

---

## Tone

- **Informative** first; specs support the story.
- **Trustworthy & helpful** — admit trade-offs, avoid hype.
- Say **value for money** / **가성비** naturally in context, not in every sentence.
- No seller API claims; cite public specs and reviews only.

---

## Checklist before publish

- [ ] `## Editor's Note` or `## 에디터 노트` at top of body
- [ ] Practical insight in every product `## N.` section
- [ ] `## Final Verdict` with buy/skip tables
- [ ] `npm run content:validate` passes (2,500+ chars, methodology, table, checklist)
