/**
 * Offline unit checks for free-translate (Gemini → Google Translate fallback).
 * Run: node scripts/test/free-translate.test.mjs
 */
import assert from "node:assert/strict";
import { createSign } from "crypto";

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

// Minimal RSA key for JWT signing tests (Google path not exercised with real crypto
// beyond our module creating JWT — we mock token endpoint).
process.env.GEMINI_API_KEY = "test-gemini";
delete process.env.GOOGLE_TRANSLATE_API_KEY;
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const { translatePostFields, hasFreeTranslateConfig } = await import(
  "../automation/free-translate.mjs"
);

assert.equal(hasFreeTranslateConfig(), true);

// 1) Gemini success
calls.length = 0;
installFetch(async ({ url }) => {
  if (url.includes("generativelanguage.googleapis.com")) {
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  titleEn: "TOZO S8 Aura Review",
                  descriptionEn: "A practical look at the TOZO S8 Aura smartwatch.",
                  bodyEn: "<p>Battery lasts all day.</p>",
                  tagsEn: ["TOZO", "smartwatch", "review"],
                }),
              },
            ],
          },
        },
      ],
    });
  }
  return textResponse("unexpected", 500);
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
assert.equal(calls.length, 1);
assert.ok(!String(calls[0].url).includes("deepseek"));
assert.ok(!String(calls[0].url).includes("openai"));

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
assert.ok(calls.some((c) => c.url.includes("generativelanguage")));
assert.ok(calls.some((c) => c.url.includes("translation.googleapis.com")));
assert.ok(calls.every((c) => !c.url.includes("deepseek")));

// 3) EN → KO via Gemini
calls.length = 0;
delete process.env.GOOGLE_TRANSLATE_API_KEY;
installFetch(async ({ url }) => {
  if (url.includes("generativelanguage.googleapis.com")) {
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  titleKo: "영문 리뷰 한글화",
                  descriptionKo: "요약입니다.",
                  bodyKo: "<p>본문입니다.</p>",
                  tagsKo: ["리뷰", "가이드", "팁"],
                }),
              },
            ],
          },
        },
      ],
    });
  }
  return textResponse("unexpected", 500);
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
