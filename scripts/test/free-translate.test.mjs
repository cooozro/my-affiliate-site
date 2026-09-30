/**
 * Offline unit checks for free-translate.
 * Run: node scripts/test/free-translate.test.mjs
 */
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const calls = [];

function installFetch(handler) {
  globalThis.fetch = async (url, init = {}) => {
    const entry = { url: String(url), init };
    calls.push(entry);
    return handler(entry);
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text, status = 200) {
  return new Response(text, { status });
}

process.env.GEMINI_API_KEY = "test-gemini";
delete process.env.GOOGLE_TRANSLATE_API_KEY;
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const mod = await import(`../automation/free-translate.mjs?t=${Date.now()}`);
const { translatePostFields, hasFreeTranslateConfig, extractJsonObject } = mod;

assert.equal(hasFreeTranslateConfig(), true);

// Balanced JSON with trailing junk (the production failure mode)
const noisy = `{"titleEn":"Hello","descriptionEn":"Desc here is long enough.","bodyEn":"<p>Hi</p>","tagsEn":["a","b","c"]}
Note: extra commentary after JSON`;
assert.equal(extractJsonObject(noisy).titleEn, "Hello");

// 1) Gemini meta JSON + body HTML (chunked path)
calls.length = 0;
let geminiCalls = 0;
installFetch(async ({ url, init }) => {
  if (!url.includes("generativelanguage.googleapis.com")) {
    return textResponse("unexpected", 500);
  }
  geminiCalls += 1;
  const body = JSON.parse(String(init.body));
  const wantsJson = body?.generationConfig?.responseMimeType === "application/json";
  if (wantsJson) {
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text:
                  JSON.stringify({
                    titleEn: "TOZO S8 Aura Review",
                    descriptionEn: "A practical look at the TOZO S8 Aura smartwatch.",
                    tagsEn: ["TOZO", "smartwatch", "review"],
                  }) + "\nExtra trailing text that used to break JSON.parse",
              },
            ],
          },
          finishReason: "STOP",
        },
      ],
    });
  }
  return jsonResponse({
    candidates: [
      {
        content: {
          parts: [{ text: "<p>Battery lasts all day.</p>" }],
        },
        finishReason: "STOP",
      },
    ],
  });
});

const gemini = await translatePostFields({
  direction: "ko-to-en",
  title: "TOZO S8 오라 리뷰",
  description: "실사용 분석",
  body: "<p>배터리가 하루 갑니다.</p>",
  tags: ["TOZO", "스마트워치", "리뷰"],
});
assert.equal(gemini.provider, "gemini");
assert.equal(gemini.titleEn, "TOZO S8 Aura Review");
assert.match(gemini.bodyEn, /Battery/);
assert.ok(geminiCalls >= 2);
assert.ok(calls.every((c) => !c.url.includes("deepseek")));

// 2) Gemini fails → Google Translate API key fallback
calls.length = 0;
process.env.GOOGLE_TRANSLATE_API_KEY = "test-gcloud";
installFetch(async ({ url, init }) => {
  if (url.includes("generativelanguage.googleapis.com")) {
    return textResponse("quota exceeded", 429);
  }
  if (url.includes("translation.googleapis.com")) {
    const body = JSON.parse(String(init.body));
    const q = Array.isArray(body.q) ? body.q : [body.q];
    return jsonResponse({
      data: {
        translations: q.map((text) => ({
          translatedText:
            text === "한글 제목"
              ? "English Title"
              : text === "설명"
                ? "Description"
                : text.includes("<p>")
                  ? "<p>Hello body</p>"
                  : text === "태그"
                    ? "tag"
                    : `EN:${text}`,
        })),
      },
    });
  }
  return textResponse("unexpected", 500);
});

const gcloud = await translatePostFields({
  direction: "ko-to-en",
  title: "한글 제목",
  description: "설명",
  body: "<p>본문</p>",
  tags: ["태그", "두번째", "세번째"],
});
assert.equal(gcloud.provider, "google-translate");
assert.equal(gcloud.titleEn, "English Title");
assert.match(gcloud.bodyEn, /Hello body/);

// 3) EN → KO via Gemini
calls.length = 0;
delete process.env.GOOGLE_TRANSLATE_API_KEY;
geminiCalls = 0;
installFetch(async ({ url, init }) => {
  if (!url.includes("generativelanguage.googleapis.com")) {
    return textResponse("unexpected", 500);
  }
  geminiCalls += 1;
  const body = JSON.parse(String(init.body));
  const wantsJson = body?.generationConfig?.responseMimeType === "application/json";
  if (wantsJson) {
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  titleKo: "영문 리뷰 한글화",
                  descriptionKo: "요약입니다.",
                  tagsKo: ["리뷰", "가이드", "팁"],
                }),
              },
            ],
          },
          finishReason: "STOP",
        },
      ],
    });
  }
  return jsonResponse({
    candidates: [
      {
        content: { parts: [{ text: "<p>본문입니다.</p>" }] },
        finishReason: "STOP",
      },
    ],
  });
});

const ko = await translatePostFields({
  direction: "en-to-ko",
  title: "English review",
  description: "Summary",
  body: "<p>Body</p>",
  tags: ["review", "guide", "tips"],
});
assert.equal(ko.provider, "gemini");
assert.equal(ko.titleKo, "영문 리뷰 한글화");
assert.match(ko.bodyKo, /본문/);

// 4) No keys
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_TRANSLATE_API_KEY;
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const fresh = await import(`../automation/free-translate.mjs?reload=${Date.now()}`);
assert.equal(fresh.hasFreeTranslateConfig(), false);
await assert.rejects(
  () =>
    fresh.translatePostFields({
      title: "a",
      body: "b",
    }),
  /No free translate key set/,
);

globalThis.fetch = originalFetch;
console.log("free-translate.test.mjs: ok");
