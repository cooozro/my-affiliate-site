/**
 * AIPICK section-skeleton variants — 3 layouts per content profile.
 * Deterministic pick from topic+profile so regenerations stay stable.
 */

const BUYING = [
  {
    key: "shortlist-first",
    headings: [
      "What this guide actually decides",
      "Named models worth a closer look",
      "Spec and TCO snapshot",
      "How each pick behaves in real rooms",
      "Who should skip these picks",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "constraint-first",
    headings: [
      "Start from budget, room, and noise limits",
      "The trade-offs that actually change the bill",
      "Three retail models that fit those limits",
      "Three-year cost, not launch-day MSRP",
      "FAQ",
      "Buy / wait / skip",
    ],
  },
  {
    key: "myth-then-models",
    headings: [
      "Claims that keep showing up in this category",
      "What public specs actually settle",
      "Models this report shortlists",
      "Scenario matrix",
      "FAQ",
      "Final verdict",
    ],
  },
];

const HEAD_TO_HEAD = [
  {
    key: "table-then-models",
    headings: [
      "The decision this comparison answers",
      "At-a-glance comparison",
      "Model A in daily use",
      "Model B in daily use",
      "Scenario winners",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "use-case-split",
    headings: [
      "Jobs each model is actually hired for",
      "Head-to-head numbers that matter",
      "Where A wins, where B wins",
      "Ownership cost over three years",
      "FAQ",
      "Who should buy which",
    ],
  },
  {
    key: "constraint-duel",
    headings: [
      "Room, power, and budget constraints",
      "Which chassis even fits",
      "Side-by-side sheet",
      "Review concerns that should pause a purchase",
      "FAQ",
      "Final verdict",
    ],
  },
];

const EXPLAINER = [
  {
    key: "question-core",
    headings: [
      "The question this article answers",
      "How the spec actually works",
      "Reference table",
      "Easy misreads",
      "FAQ",
      "Key takeaways",
    ],
  },
  {
    key: "myth-bust",
    headings: [
      "The claim worth stress-testing",
      "Terms that change the answer",
      "A worked example with named models",
      "FAQ",
      "Related buying guides",
    ],
  },
  {
    key: "layers",
    headings: [
      "Three layers: marketing, spec sheet, ownership",
      "What to read on the spec sheet",
      "Comparison or reference table",
      "FAQ",
      "Key takeaways",
    ],
  },
];

const CHECKLIST = [
  {
    key: "numbered-risk",
    headings: [
      "When to use this checklist",
      "Pre-purchase checks",
      "Red flags that should stop the order",
      "FAQ",
      "Priority order",
    ],
  },
  {
    key: "grouped-risk",
    headings: [
      "Fit, power, and install first",
      "The checklist",
      "Quick thresholds",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "sequence",
    headings: [
      "Do these in order, not all at once",
      "Pre-purchase checks",
      "Consumables and three-year cost",
      "FAQ",
      "What to decide today",
    ],
  },
];

const DEEP_DIVE = [
  {
    key: "why-now",
    headings: [
      "Why this model is in the conversation now",
      "At-a-glance spec sheet",
      "Design and everyday use",
      "Core performance",
      "Who should buy / who should skip",
      "How it compares to one rival",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "audience-first",
    headings: [
      "Who this review is for",
      "A day with the device",
      "Spec sheet that matters",
      "Strengths and weaknesses",
      "One rival, briefly",
      "FAQ",
      "Buy / wait / skip",
    ],
  },
  {
    key: "tco-first",
    headings: [
      "What it costs to keep, not just to buy",
      "At-a-glance spec sheet",
      "How it behaves in real rooms",
      "Strengths and weaknesses",
      "FAQ",
      "Final verdict",
    ],
  },
];

const SCENARIO = [
  {
    key: "three-rooms",
    headings: [
      "Who this guide is for",
      "Scenario one",
      "Scenario two",
      "Scenario three",
      "Quick comparison of recommended picks",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "constraint-then-picks",
    headings: [
      "Budget, space, and noise limits",
      "Scenario: tight space",
      "Scenario: long hours",
      "Scenario: shared household",
      "Picks in one view",
      "FAQ",
      "Final verdict",
    ],
  },
  {
    key: "job-to-be-done",
    headings: [
      "The job to be done",
      "Scenario A",
      "Scenario B",
      "Scenario C",
      "FAQ",
      "What to buy for which job",
    ],
  },
];

const BY_PROFILE = {
  "buying-guide": BUYING,
  "head-to-head": HEAD_TO_HEAD,
  explainer: EXPLAINER,
  checklist: CHECKLIST,
  "model-deep-dive": DEEP_DIVE,
  "scenario-guide": SCENARIO,
};

function hashSeed(input) {
  let h = 2166136261;
  const s = String(input || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

export function pickSectionSkeleton(contentProfile, seedInput) {
  const list = BY_PROFILE[contentProfile] ?? BUYING;
  return list[hashSeed(seedInput) % list.length];
}

export function formatSkeletonForPrompt(skeleton) {
  const lines = skeleton.headings.map((h, i) => `${i + 1}. ## ${h}`).join("\n");
  return `SECTION VARIANT \`${skeleton.key}\` — use this H2 order (paraphrase headings, do not copy as a template stamp):\n${lines}`;
}

export const PROMPT_DIVERSITY_RULE =
  "Vary sentence structure, transitions, and table layout versus other articles on this site. Do not reuse the same opener or a canned analysis-methodology stump. Methodology belongs on /about, not in the article body.";
