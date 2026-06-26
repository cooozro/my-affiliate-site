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

function buildFrontmatter(localeData, shared, draft = true) {
  return {
    title: localeData.title,
    description: localeData.description,
    date: shared.date,
    tags: localeData.tags,
    draft,
    createdAt: shared.createdAt,
    ...(shared.liveData ? { liveData: true } : {}),
    ...(shared.coverImage ? { coverImage: shared.coverImage } : {}),
    ...(shared.coverImageAlt ? { coverImageAlt: shared.coverImageAlt } : {}),
    ...(shared.coverImageCredit ? { coverImageCredit: shared.coverImageCredit } : {}),
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

  const topic = pickTopic(state);
  const year = new Date().getFullYear();
  const prompt = buildGenerationPrompt(topic, year);

  console.log(`Generating draft: ${topic.id} (${topic.category})`);
  const article = await callOpenAI(prompt);

  const slug = uniqueSlug(article.slug ?? `${year}-${topic.id}-guide`);
  const createdAt = new Date().toISOString();
  const date = kstDateString();

  const imageMeta = await fetchCoverImage(
    slug,
    article.imageQuery ?? topic.imageQuery,
  );

  const shared = {
    date,
    createdAt,
    liveData: Boolean(article.liveData ?? topic.liveData),
    ...imageMeta,
  };

  writePost(slug, "en", buildFrontmatter(article.en, shared), article.en.body);
  writePost(slug, "ko", buildFrontmatter(article.ko, shared), article.ko.body);

  const issues = validatePostFiles(slug);
  if (issues.length > 0) {
    throw new Error(`Validation failed for ${slug}:\n${issues.join("\n")}`);
  }

  state.writeCountToday += 1;
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

