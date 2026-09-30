/**
 * Free locale translation for existing post text (KO↔EN).
 * Primary: Gemini API Free  →  Fallback: Google Cloud Translate
 * Do NOT use DeepSeek/OpenAI here — those stay for new draft writing only.
 *
 * Long HTML bodies are translated in chunks as HTML (not one giant JSON blob),
 * because Gemini often returns truncated/trailing junk that breaks JSON.parse.
 */

import { createSign } from "crypto";

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
].filter(Boolean);

const TRANSLATE_SCOPE = "https://www.googleapis.com/auth/cloud-translation";
const BODY_CHUNK_MAX = 3500;

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Extract first balanced JSON object; ignore trailing prose after it. */
export function extractJsonObject(text) {
  const trimmed = String(text ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf("{");
  if (start < 0) {
    throw new Error("Model response was not valid JSON (no object found)");
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const slice = trimmed.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Model response was not valid JSON (${detail})`);
        }
      }
    }
  }

  throw new Error(
    "Model response was not valid JSON (truncated or unbalanced object)",
  );
}

export function hasGeminiTranslateKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function hasGoogleTranslateConfig() {
  return Boolean(
    process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
  );
}

export function hasFreeTranslateConfig() {
  return hasGeminiTranslateKey() || hasGoogleTranslateConfig();
}

function directionPairs(direction) {
  if (direction === "en-to-ko") {
    return {
      source: "en",
      target: "ko",
      labelFrom: "English",
      labelTo: "Korean",
    };
  }
  return {
    source: "ko",
    target: "en",
    labelFrom: "Korean",
    labelTo: "American English",
  };
}

function normalizeResult(parsed, direction) {
  const isEn = direction !== "en-to-ko";
  const title = String(
    parsed[isEn ? "titleEn" : "titleKo"] ?? parsed.title ?? "",
  ).trim();
  const body = String(
    parsed[isEn ? "bodyEn" : "bodyKo"] ?? parsed.body ?? "",
  ).trim();
  const description = String(
    parsed[isEn ? "descriptionEn" : "descriptionKo"] ??
      parsed.description ??
      "",
  )
    .trim()
    .slice(0, 160);
  const tagsRaw = parsed[isEn ? "tagsEn" : "tagsKo"] ?? parsed.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    : [];
  if (!title || !body) {
    throw new Error("empty translation result");
  }
  if (isEn) {
    return {
      titleEn: title,
      descriptionEn: description || title.slice(0, 155),
      bodyEn: body,
      tagsEn: tags,
    };
  }
  return {
    titleKo: title,
    descriptionKo: description || title.slice(0, 155),
    bodyKo: body,
    tagsKo: tags,
  };
}

async function geminiGenerate({ system, user, json = false }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: 8192,
    };
    if (json) {
      generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig,
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      lastError = new Error(
        `Gemini ${model} ${response.status}: ${raw.slice(0, 240)}`,
      );
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      lastError = new Error(`Gemini ${model} returned non-JSON envelope`);
      continue;
    }
    const finish = data?.candidates?.[0]?.finishReason;
    const text = (data?.candidates ?? [])
      .flatMap((c) => c?.content?.parts ?? [])
      .map((p) => p?.text ?? "")
      .join("")
      .trim();
    if (!text) {
      lastError = new Error(
        `Gemini ${model} empty candidates (finish=${finish ?? "n/a"})`,
      );
      continue;
    }
    if (finish === "MAX_TOKENS" && json) {
      lastError = new Error(`Gemini ${model} truncated JSON (MAX_TOKENS)`);
      continue;
    }
    return { text, model, finish };
  }
  throw lastError ?? new Error("Gemini translation failed");
}

async function geminiGenerateJson({ system, user }) {
  const { text, model } = await geminiGenerate({ system, user, json: true });
  return { json: extractJsonObject(text), model };
}

function stripHtmlFences(text) {
  const trimmed = String(text ?? "").trim();
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function chunkHtml(text, maxLen = BODY_CHUNK_MAX) {
  const src = String(text ?? "");
  if (src.length <= maxLen) return [src];
  const parts = [];
  let buf = "";
  const pieces = src.split(/(?<=<\/(?:p|h[1-6]|li|div|section|article|ul|ol|table|tr)>)/i);
  for (const piece of pieces) {
    if (!piece) continue;
    if (buf.length + piece.length > maxLen && buf) {
      parts.push(buf);
      buf = piece;
    } else {
      buf += piece;
    }
  }
  if (buf) parts.push(buf);
  const out = [];
  for (const part of parts) {
    if (part.length <= maxLen) {
      out.push(part);
      continue;
    }
    for (let i = 0; i < part.length; i += maxLen) {
      out.push(part.slice(i, i + maxLen));
    }
  }
  return out.length ? out : [""];
}

async function translateMetaWithGemini(input, direction) {
  const { labelFrom, labelTo } = directionPairs(direction);
  const isEn = direction !== "en-to-ko";
  const titleKey = isEn ? "titleEn" : "titleKo";
  const descKey = isEn ? "descriptionEn" : "descriptionKo";
  const tagsKey = isEn ? "tagsEn" : "tagsKo";

  const system = `You translate ${labelFrom} affiliate SEO metadata to natural ${labelTo} for aipick.shop.
Keep brand/product names unchanged.
Return JSON only: { "${titleKey}": string, "${descKey}": string (50-155 chars), "${tagsKey}": string[] (≥3 SEO tags) }`;

  const user = `Title: ${input.title}
Description: ${input.description || input.title}
Tags: ${(input.tags || []).join(", ")}`;

  const { json, model } = await geminiGenerateJson({ system, user });
  const title = String(json[titleKey] ?? json.title ?? "").trim();
  const description = String(json[descKey] ?? json.description ?? "")
    .trim()
    .slice(0, 160);
  const tagsRaw = json[tagsKey] ?? json.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
    : [];
  if (!title) throw new Error("empty meta translation");
  return {
    title,
    description: description || title.slice(0, 155),
    tags,
    model,
  };
}

async function translateBodyChunkWithGemini(chunk, direction, modelHint) {
  const { labelFrom, labelTo } = directionPairs(direction);
  const system = `You translate ${labelFrom} HTML blog fragments to natural ${labelTo}.
Preserve every HTML tag, attribute, image path (/images/posts/...), and URL exactly.
Do not wrap output in markdown fences. Return HTML only — no commentary.`;
  const user = `Translate this HTML fragment:\n\n${chunk}`;
  const { text, model } = await geminiGenerate({
    system,
    user,
    json: false,
  });
  const html = stripHtmlFences(text);
  if (!html) throw new Error("empty body chunk translation");
  return { html, model: modelHint || model };
}

async function translateWithGemini(input, direction) {
  const meta = await translateMetaWithGemini(input, direction);
  const chunks = chunkHtml(input.body, BODY_CHUNK_MAX);
  const translatedChunks = [];
  let model = meta.model;
  for (const chunk of chunks) {
    const part = await translateBodyChunkWithGemini(chunk, direction, model);
    translatedChunks.push(part.html);
    model = part.model;
  }
  const body = translatedChunks.join("").trim();
  if (!body) throw new Error("empty body translation");

  const parsed =
    direction === "en-to-ko"
      ? {
          titleKo: meta.title,
          descriptionKo: meta.description,
          bodyKo: body,
          tagsKo: meta.tags,
        }
      : {
          titleEn: meta.title,
          descriptionEn: meta.description,
          bodyEn: body,
          tagsEn: meta.tags,
        };

  return {
    ...normalizeResult(parsed, direction),
    provider: "gemini",
    model,
  };
}

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON");
  }
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: TRANSLATE_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = sign
    .sign(serviceAccount.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google auth failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data.access_token) throw new Error("Google auth missing access_token");
  return data.access_token;
}

async function googleTranslateTexts(texts, { source, target, format }) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  const serviceAccount = parseServiceAccount();
  if (!apiKey && !serviceAccount) {
    throw new Error(
      "GOOGLE_TRANSLATE_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON required for Cloud Translate fallback",
    );
  }

  const headers = { "Content-Type": "application/json" };
  let url = "https://translation.googleapis.com/language/translate/v2";
  if (apiKey) {
    url += `?key=${encodeURIComponent(apiKey)}`;
  } else {
    const token = await getGoogleAccessToken(serviceAccount);
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      q: texts,
      source,
      target,
      format,
    }),
  });
  const raw = await response.text();
  if (!response.ok) {
    if (response.status === 403 && /has not been used|disabled/i.test(raw)) {
      throw new Error(
        "Google Translate 403: Cloud Translation API disabled — enable translate.googleapis.com on the GCP project (or set GOOGLE_TRANSLATE_API_KEY)",
      );
    }
    throw new Error(`Google Translate ${response.status}: ${raw.slice(0, 300)}`);
  }
  const data = JSON.parse(raw);
  const translations = data?.data?.translations;
  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error("Google Translate returned unexpected payload");
  }
  return translations.map((t) => String(t.translatedText ?? ""));
}

async function googleTranslateLong(text, opts) {
  const chunks = chunkHtml(text, 4500);
  const translated = [];
  for (const chunk of chunks) {
    const [one] = await googleTranslateTexts([chunk], opts);
    translated.push(one);
  }
  return translated.join("");
}

async function translateWithGoogle(input, direction) {
  const { source, target } = directionPairs(direction);
  const title = (
    await googleTranslateTexts([input.title], {
      source,
      target,
      format: "text",
    })
  )[0].trim();

  const description = input.description
    ? (
        await googleTranslateTexts([input.description], {
          source,
          target,
          format: "text",
        })
      )[0]
        .trim()
        .slice(0, 160)
    : "";

  const body = (
    await googleTranslateLong(input.body, {
      source,
      target,
      format: "html",
    })
  ).trim();

  let tags = [];
  if (input.tags?.length) {
    tags = (
      await googleTranslateTexts(input.tags.map(String), {
        source,
        target,
        format: "text",
      })
    )
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  const parsed =
    direction === "en-to-ko"
      ? {
          titleKo: title,
          descriptionKo: description,
          bodyKo: body,
          tagsKo: tags,
        }
      : {
          titleEn: title,
          descriptionEn: description,
          bodyEn: body,
          tagsEn: tags,
        };

  return {
    ...normalizeResult(parsed, direction),
    provider: "google-translate",
    model: "nmt",
  };
}

/**
 * @param {{ title: string, description?: string, body: string, tags?: string[], direction?: 'ko-to-en'|'en-to-ko' }} input
 */
export async function translatePostFields(input) {
  const direction = input.direction === "en-to-ko" ? "en-to-ko" : "ko-to-en";
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!title || !body) {
    throw new Error("title and body are required for translation");
  }
  if (!hasFreeTranslateConfig()) {
    throw new Error(
      "No free translate key set. Add GEMINI_API_KEY (preferred) or GOOGLE_TRANSLATE_API_KEY / GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const payload = {
    title,
    description: String(input.description ?? "").trim(),
    body,
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };

  const errors = [];
  if (hasGeminiTranslateKey()) {
    try {
      return await translateWithGemini(payload, direction);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (hasGoogleTranslateConfig()) {
    try {
      return await translateWithGoogle(payload, direction);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(
    `Free translate failed (Gemini → Google Translate): ${errors.join(" | ") || "no provider"}`,
  );
}
