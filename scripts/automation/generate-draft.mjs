import { buildGenerationPrompt } from "./prompts.mjs";
import { pickTopic } from "./topics.mjs";
import { fetchCoverImage } from "./fetch-image.mjs";
import {
  countDrafts,
  slugExists,
  validatePostFiles,
  writePost,
} from "./posts-fs.mjs";
import {
  kstDateString,
  loadState,
  resetDailyCounters,
  saveState,
} from "./state.mjs";
import { pickContentProfile } from "../lib/content-profiles.mjs";
import { buildCoverAlt, resolveImageContext } from "../lib/image-query.mjs";

const MAX_WRITES_PER_DAY = 2;
const TARGET_DRAFT_BUFFER = 2;

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for automated writing");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write high-quality bilingual tech buying guides. Output strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty OpenAI response");

  return JSON.parse(text);
}

function uniqueSlug(base) {
  let slug = base.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  slug = slug.replace(/^-|-$/g, "");
  if (!slugExists(slug)) return slug;

  const suffix = kstDateString().replace(/-/g, "");
  return `${slug}-${suffix}`;
}

function buildFrontmatter(locale, localeData, shared, draft = true) {
  const coverImageAlt =
    locale === "ko" && shared.coverImageAltKo
      ? shared.coverImageAltKo
      : shared.coverImageAlt;

  return {
    title: localeData.title,
    description: localeData.description,
    date: shared.date,
    tags: localeData.tags,
    draft,
    contentProfile: shared.contentProfile ?? "buying-guide",
    createdAt: shared.createdAt,
    ...(shared.liveData ? { liveData: true } : {}),
    ...(shared.coverImage ? { coverImage: shared.coverImage } : {}),
    ...(coverImageAlt ? { coverImageAlt } : {}),
    ...(shared.coverImageCredit ? { coverImageCredit: shared.coverImageCredit } : {}),
    ...(shared.coverImageProvider ? { coverImageProvider: shared.coverImageProvider } : {}),
  };
}

export async function generateOneDraft(options = {}) {
  const { bypassWriteCap = false } = options;
  const state = loadState();
  resetDailyCounters(state);

  if (!bypassWriteCap && state.writeCountToday >= MAX_WRITES_PER_DAY) {
    console.log(`Daily write limit reached (${MAX_WRITES_PER_DAY}/day KST)`);
    saveState(state);
    return null;
  }

  const contentProfile = pickContentProfile(state);
  const topic = pickTopic(state, { contentProfile });
  return generateDraftForTopic(topic, contentProfile, { bypassWriteCap, state });
}

function normalizeRequestTopic(raw) {
  if (!raw?.id || !raw?.angle) {
    throw new Error("cursor-draft-request missing topic.id or topic.angle");
  }
  return {
    id: raw.id,
    category: raw.category ?? "gadgets",
    angle: raw.angle,
    imageQuery: raw.imageQuery,
    imageSearchKeywords: raw.imageSearchKeywords,
    topicCluster: raw.topicCluster,
    liveData: raw.liveData,
    seasons: raw.seasons,
  };
}

export async function generateDraftFromRequest(request, options = {}) {
  const { bypassWriteCap = true } = options;
  const topic = normalizeRequestTopic(request.topic);
  const contentProfile = request.contentProfile ?? "buying-guide";
  const state = loadState();
  resetDailyCounters(state);

  if (!bypassWriteCap && state.writeCountToday >= MAX_WRITES_PER_DAY) {
    console.log(`Daily write limit reached (${MAX_WRITES_PER_DAY}/day KST)`);
    saveState(state);
    return null;
  }

  return generateDraftForTopic(topic, contentProfile, { bypassWriteCap, state });
}

async function generateDraftForTopic(topic, contentProfile, options = {}) {
  const { bypassWriteCap = false, state: inputState } = options;
  const state = inputState ?? loadState();
  const year = new Date().getFullYear();
  const prompt = buildGenerationPrompt(topic, year, contentProfile);

  console.log(`Generating draft: ${topic.id} (${topic.category}, ${contentProfile})`);
  const article = await callOpenAI(prompt);

  const slug = uniqueSlug(article.slug ?? `${year}-${topic.id}-guide`);
  const createdAt = new Date().toISOString();
  const date = kstDateString();

  const imageInput = {
    title: article.en?.title,
    tags: article.en?.tags ?? article.tags,
    imageQuery: article.imageQuery ?? topic.imageQuery,
    imageSearchKeywords: topic.imageSearchKeywords,
    topicCluster: topic.topicCluster,
    topic,
  };
  const imageContext = resolveImageContext(slug, imageInput);
  const imageMeta = await fetchCoverImage(slug, imageInput);

  const shared = {
    date,
    createdAt,
    contentProfile: article.contentProfile ?? contentProfile,
    liveData: Boolean(article.liveData ?? topic.liveData),
    ...(imageMeta ?? {}),
    ...(imageMeta
      ? {
          coverImageAlt: buildCoverAlt("en", {
            ...imageContext,
            title: article.en?.title,
          }),
          coverImageAltKo: buildCoverAlt("ko", {
            ...imageContext,
            title: article.ko?.title,
          }),
        }
      : {}),
  };

  writePost(slug, "en", buildFrontmatter("en", article.en, shared), article.en.body);
  writePost(slug, "ko", buildFrontmatter("ko", article.ko, shared), article.ko.body);

  const issues = validatePostFiles(slug, {
    phase: "draft",
    applyRepair: true,
  });
  if (issues.length > 0) {
    throw new Error(`Draft integrity gate failed for ${slug}:\n${issues.join("\n")}`);
  }

  if (!bypassWriteCap) {
    state.writeCountToday += 1;
  }
  state.history = [
    ...(state.history ?? []),
    { action: "write", slug, at: createdAt, topic: topic.id },
  ].slice(-50);
  saveState(state);

  console.log(`Draft created: ${slug}`);
  return slug;
}

export async function maintainDraftBuffer(options = {}) {
  const { bypassWriteCap = false, maxCreate } = options;
  let created = 0;

  while (countDrafts() < TARGET_DRAFT_BUFFER) {
    if (maxCreate !== undefined && created >= maxCreate) break;

    const state = loadState();
    resetDailyCounters(state);

    if (!bypassWriteCap && state.writeCountToday >= MAX_WRITES_PER_DAY) {
      console.log(
        `Buffer below ${TARGET_DRAFT_BUFFER} but daily write cap reached — will refill tomorrow`,
      );
      break;
    }

    const slug = await generateOneDraft({ bypassWriteCap });
    if (!slug) break;
    created += 1;
  }

  console.log(`Draft buffer: ${countDrafts()}/${TARGET_DRAFT_BUFFER}, created ${created} new`);
  return created;
}

