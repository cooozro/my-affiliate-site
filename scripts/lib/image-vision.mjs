/**
 * Vision-based stock photo relevance scoring (OpenAI).
 * Falls back gracefully when OPENAI_API_KEY is unset.
 */

const OPENAI_CHAT = "https://api.openai.com/v1/chat/completions";
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const VISION_MIN_SCORE = Number(process.env.IMAGE_VISION_MIN_SCORE ?? 6);
const VISION_CANDIDATE_LIMIT = Number(process.env.IMAGE_VISION_CANDIDATE_LIMIT ?? 10);

export function visionSelectionEnabled() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function visionMinScore() {
  return VISION_MIN_SCORE;
}

/**
 * @param {string} imageUrl - thumbnail or full image URL
 * @param {{ title?: string, productLabel: string, negativeTags: string[] }} ctx
 * @returns {Promise<{ score: number, reason: string }>}
 */
export async function scoreImageRelevanceWithVision(imageUrl, ctx) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { score: -1, reason: "vision disabled" };
  }

  const negatives = (ctx.negativeTags ?? []).slice(0, 20).join(", ");
  const prompt = `You judge stock photos for a product review blog cover image.

Article title: ${ctx.title ?? "n/a"}
REQUIRED subject in the photo: ${ctx.productLabel}
Must NOT be: ${negatives || "unrelated subjects, wrong product, abstract-only art"}

Score 0-10:
- 9-10: clear photo of the correct product or realistic in-use scene
- 6-8: correct category, product visible but not ideal
- 3-5: tangentially related or ambiguous
- 0-2: wrong subject (e.g. airplane when air purifier needed), people-only, irrelevant

Reply ONLY JSON: {"score": number, "reason": "max 12 words"}`;

  const response = await fetch(OPENAI_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI vision ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { score: 0, reason: "parse failed" };

  try {
    const parsed = JSON.parse(match[0]);
    const score = Number(parsed.score);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0,
      reason: String(parsed.reason ?? "").slice(0, 120),
    };
  } catch {
    return { score: 0, reason: "invalid json" };
  }
}

/**
 * Rank candidates with vision; preserves textScore on each item.
 * @param {Array<{ imageUrl: string, thumbUrl?: string, textScore?: number, provider: string, assetId: string | number }>} candidates
 * @param {{ title?: string, productKeywords: string[], negativeTags: string[] }} ctx
 */
export async function rankCandidatesWithVision(candidates, ctx) {
  if (!visionSelectionEnabled() || candidates.length === 0) {
    return candidates.map((c) => ({ ...c, visionScore: null, visionReason: null }));
  }

  const productLabel = ctx.productKeywords.slice(0, 3).join(" / ");
  const pool = candidates.slice(0, VISION_CANDIDATE_LIMIT);
  const ranked = [];

  for (const candidate of pool) {
    const thumb = candidate.thumbUrl || candidate.imageUrl;
    try {
      const { score, reason } = await scoreImageRelevanceWithVision(thumb, {
        title: ctx.title,
        productLabel,
        negativeTags: ctx.negativeTags,
      });
      ranked.push({
        ...candidate,
        visionScore: score,
        visionReason: reason,
      });
      console.log(
        `  vision ${candidate.provider}:${candidate.assetId} → ${score}/10 (${reason})`,
      );
    } catch (error) {
      console.warn(
        `  vision failed ${candidate.provider}:${candidate.assetId}: ${error.message}`,
      );
      ranked.push({
        ...candidate,
        visionScore: 0,
        visionReason: error.message,
      });
    }
  }

  return ranked.sort((a, b) => {
    const va = a.visionScore ?? -1;
    const vb = b.visionScore ?? -1;
    if (vb !== va) return vb - va;
    return (b.textScore ?? 0) - (a.textScore ?? 0);
  });
}

export function pickVisionWinner(ranked) {
  const withVision = ranked.filter((c) => typeof c.visionScore === "number" && c.visionScore >= 0);
  if (withVision.length === 0) return null;

  const passing = withVision.filter((c) => c.visionScore >= VISION_MIN_SCORE);
  if (passing.length > 0) return passing[0];

  const best = withVision[0];
  if (best.visionScore >= 4) return best;
  return null;
}
