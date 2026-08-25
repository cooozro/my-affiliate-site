/**
 * Model-deep-dive image relevance gate.
 * Blocks rival-brand stock and unlabeled generic product cuts when a focus model is set.
 */

/** Rival brand tokens that must not appear in stock alt/URL when focus brand is X. */
export const RIVAL_BRAND_TOKENS = {
  Sony: ["jbl", "bose", "marshall", "ultimate ears", "ue boom", "harman", "beats", "anker", "tribit"],
  JBL: ["sony", "bose", "marshall", "ultimate ears", "beats"],
  Bose: ["sony", "jbl", "marshall", "beats", "sennheiser"],
  Samsung: ["apple", "iphone", "google pixel", "xiaomi", "oppo", "oneplus"],
  Apple: ["samsung", "galaxy", "google pixel", "xiaomi"],
  LG: ["samsung", "whirlpool", "ge appliances"],
  Dyson: ["shark", "roomba", "irobot", "tineco"],
  Marshall: ["sony", "jbl", "bose", "fender"],
  "Ultimate Ears": ["sony", "jbl", "bose", "marshall"],
  UE: ["sony", "jbl", "bose", "marshall"],
};

/** Cheap generic / counterfeit model tokens often mislabeled as “Bluetooth speaker”. */
export const GENERIC_SPEAKER_JUNK = [
  "ms-1615",
  "ms1615",
  "hi-fi badge",
  "no-name",
  "unbranded",
];

export function normalizeBrandKey(brand) {
  const b = String(brand || "").trim();
  if (!b) return "";
  if (/^ue$/i.test(b) || /ultimate\s*ears/i.test(b)) return "Ultimate Ears";
  const hit = Object.keys(RIVAL_BRAND_TOKENS).find(
    (k) => k.toLowerCase() === b.toLowerCase(),
  );
  return hit || b;
}

export function rivalTokensForBrand(brand) {
  const key = normalizeBrandKey(brand);
  return RIVAL_BRAND_TOKENS[key] ?? [];
}

/**
 * @param {string} text
 * @param {{ brand?: string, name?: string, id?: string }} model
 * @returns {{ ok: boolean, reason?: string }}
 */
export function evaluateModelImageText(text, model) {
  const blob = String(text || "").toLowerCase();
  if (!blob.trim()) {
    return { ok: false, reason: "empty alt/text — cannot verify model relevance" };
  }
  const brand = normalizeBrandKey(model?.brand);
  const name = String(model?.name || "").toLowerCase();

  for (const junk of GENERIC_SPEAKER_JUNK) {
    if (blob.includes(junk)) {
      return { ok: false, reason: `generic/junk product token: ${junk}` };
    }
  }

  for (const rival of rivalTokensForBrand(brand)) {
    if (rival.length >= 3 && blob.includes(rival)) {
      // Allow if focus brand also clearly named (comparison shots) — still reject for cover.
      if (!brand || !blob.includes(brand.toLowerCase())) {
        return { ok: false, reason: `rival brand in alt/url: ${rival}` };
      }
    }
  }

  return { ok: true };
}

/**
 * Stricter gate for model-deep-dive *cover*: prefer brand mention or press-kit provider.
 * @param {{ provider?: string, providerAlt?: string, relevanceText?: string, searchQuery?: string, imageUrl?: string }} candidate
 * @param {{ brand?: string, name?: string, id?: string }} model
 * @param {{ role?: 'cover'|'body' }} options
 */
export function passesModelDeepDiveCandidate(candidate, model, options = {}) {
  const role = options.role ?? "cover";
  const provider = String(candidate?.provider || "").toLowerCase();
  if (provider === "press-kit") return { ok: true };

  const text = [
    candidate?.providerAlt,
    candidate?.relevanceText,
    candidate?.searchQuery,
    candidate?.imageUrl,
  ]
    .filter(Boolean)
    .join(" ");

  const base = evaluateModelImageText(text, model);
  if (!base.ok) return base;

  const blob = text.toLowerCase();
  const brand = normalizeBrandKey(model?.brand).toLowerCase();
  const name = String(model?.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const nameCompact = name.replace(/\s+/g, "");

  if (role === "cover") {
    const hasBrand = brand && blob.includes(brand);
    const hasName =
      (name && blob.includes(name)) ||
      (nameCompact.length >= 4 && blob.replace(/\s+/g, "").includes(nameCompact));
    // Stock cover without brand/model tokens is category-generic → reject for deep-dive.
    if (!hasBrand && !hasName) {
      return {
        ok: false,
        reason: "stock cover missing focus brand/model tokens in alt/url",
      };
    }
  }

  return { ok: true };
}

/**
 * Audit published/draft frontmatter + body alts for model-deep-dive.
 * @returns {string[]} error messages
 */
export function auditModelDeepDiveImageRelevance(slug, data, body = "") {
  if (String(data?.contentProfile || "") !== "model-deep-dive") return [];
  const brand = data?.modelPickBrand;
  const name = data?.modelPickName;
  if (!brand || !name) return [];

  const model = {
    brand,
    name,
    id: data?.modelPickId,
  };
  const errors = [];
  const provider = String(data?.coverImageProvider || "").toLowerCase();
  const coverBlob = [
    data?.coverImageAlt,
    data?.coverImageAltKo,
    data?.coverImageSourceUrl,
    data?.coverImage,
  ]
    .filter(Boolean)
    .join(" ");

  if (provider !== "press-kit") {
    const coverGate = passesModelDeepDiveCandidate(
      {
        provider,
        providerAlt: coverBlob,
        imageUrl: data?.coverImageSourceUrl,
      },
      model,
      { role: "cover" },
    );
    if (!coverGate.ok) {
      errors.push(`${slug}: model-deep-dive cover rejected — ${coverGate.reason}`);
    }
  }

  const bodyText = String(body || "");
  for (const m of bodyText.matchAll(/!\[([^\]]*)\]\((\/images\/posts\/[^)]+)\)/g)) {
    const alt = m[1] || "";
    const gate = evaluateModelImageText(alt, model);
    if (!gate.ok) {
      errors.push(`${slug}: body image alt rejected — ${gate.reason} (${alt.slice(0, 60)})`);
    }
  }
  for (const m of bodyText.matchAll(/<img[^>]+alt=["']([^"']*)["'][^>]*>/gi)) {
    const alt = m[1] || "";
    const gate = evaluateModelImageText(alt, model);
    if (!gate.ok) {
      errors.push(`${slug}: body <img> alt rejected — ${gate.reason}`);
    }
  }

  return errors;
}
