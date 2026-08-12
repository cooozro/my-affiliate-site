import { buildGenerationPrompt } from "./prompts.mjs";
import { chatJsonCompletion } from "./llm-chat.mjs";
import { buildWriterSystemPrompt } from "./writer-system-prompt.mjs";
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
import { pickContentProfile, getTemplatePath } from "../lib/content-profiles.mjs";
import { buildCoverAlts, resolveImageContext } from "../lib/image-query.mjs";
import { ensureImageApiEnv } from "../lib/image-api-env.mjs";
import {
  MAX_PUBLISH_PER_DAY,
  TARGET_DRAFT_COUNT,
} from "../lib/publish-schedule.mjs";
import { getCurrentSeason, isTopicInSeason } from "../lib/season-topics.mjs";

/** Writes track publish cadence: one ready draft waiting after each go-live. */
const MAX_WRITES_PER_DAY = MAX_PUBLISH_PER_DAY;
const TARGET_DRAFT_BUFFER = TARGET_DRAFT_COUNT;

/**
 * Two-pass writer: EN(+meta) then KO. Single-shot bilingual JSON routinely
 * hits DeepSeek output caps and truncates mid-string.
 */
async function callLlmWriter(prompt, contentProfile, options = {}) {
  const templatePath =
    options.templatePath ?? getTemplatePath(contentProfile ?? "buying-guide");
  const system = buildWriterSystemPrompt(contentProfile, { templatePath });
  const providerOpt = options.provider;

  const enPass = await chatJsonCompletion({
    system,
    user: `${prompt}

PASS 1 of 2 — English only.
Return JSON with: slug, topicId, topicCluster, contentProfile, imageQuery, liveData, and "en" { title, description, tags, body }.
Do NOT include a "ko" object in this pass. Keep EN body complete and publish-ready.`,
    provider: providerOpt,
    temperature: 0.7,
    json: true,
  });

  console.log(`LLM writer pass1(EN): provider=${enPass.provider}, model=${enPass.model}`);

  const base = enPass.article;
  if (!base?.en?.body || !base?.en?.title) {
    throw new Error("LLM EN pass missing en.title/en.body");
  }

  const koPass = await chatJsonCompletion({
    system,
    user: `PASS 2 of 2 — Korean locale for the same article.

Translate faithfully (not a summary). Same H2/H3 structure, tables, FAQ count, methodology, and AdSense model-name depth as the English draft.

English source (do not rewrite EN; output KO only):
${JSON.stringify(
  {
    slug: base.slug,
    topicId: base.topicId,
    contentProfile: base.contentProfile ?? contentProfile,
    en: base.en,
  },
  null,
  2,
)}

Return JSON with only:
{
  "ko": {
    "title": "...",
    "description": "50-160 chars",
    "tags": ["..."],
    "body": "full Korean markdown, same structure as EN"
  }
}`,
    provider: providerOpt,
    temperature: 0.55,
    json: true,
  });

  console.log(`LLM writer pass2(KO): provider=${koPass.provider}, model=${koPass.model}`);

  const ko = koPass.article?.ko;
  if (!ko?.body || !ko?.title) {
    throw new Error("LLM KO pass missing ko.title/ko.body");
  }

  return {
    article: {
      ...base,
      ko,
    },
    writingProvider: enPass.provider,
  };
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
    ...(shared.topicId ? { topicId: shared.topicId } : {}),
    ...(shared.topicCluster ? { topicCluster: shared.topicCluster } : {}),
    ...(shared.writingProvider ? { writingProvider: shared.writingProvider } : {}),
    createdAt: shared.createdAt,
    ...(shared.liveData ? { liveData: true } : {}),
    ...(shared.coverImage ? { coverImage: shared.coverImage } : {}),
    ...(coverImageAlt ? { coverImageAlt } : {}),
    ...(locale === "en" && shared.coverImageAltKo
      ? { coverImageAltKo: shared.coverImageAltKo }
      : {}),
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

  return generateDraftForTopic(topic, contentProfile, {
    bypassWriteCap,
    state,
    writingMode: request.writingMode,
    toneVariant: request.toneVariant,
    benchmarkOutline: request.benchmarkOutline,
    templatePath: request.templatePath,
    provider: options.provider ?? request.preferredProvider,
  });
}

async function generateDraftForTopic(topic, contentProfile, options = {}) {
  const { bypassWriteCap = false, state: inputState } = options;
  if (!isTopicInSeason(topic)) {
    const season = getCurrentSeason();
    throw new Error(
      `Off-season topic blocked: ${topic.id} is not eligible in ${season} (KST)`,
    );
  }
  const state = inputState ?? loadState();
  const year = new Date().getFullYear();
  const prompt = buildGenerationPrompt(topic, year, contentProfile, {
    writingMode: options.writingMode,
    toneVariant: options.toneVariant,
    benchmarkOutline: options.benchmarkOutline,
  });

  console.log(`Generating draft: ${topic.id} (${topic.category}, ${contentProfile})`);
  ensureImageApiEnv();
  const { article, writingProvider } = await callLlmWriter(
    prompt,
    contentProfile,
    {
      provider: options.provider,
      templatePath: options.templatePath,
    },
  );

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
    topicId: topic.id,
  };
  const imageContext = resolveImageContext(slug, imageInput);
  const imageMeta = await fetchCoverImage(slug, imageInput);

  const shared = {
    date,
    createdAt,
    contentProfile: article.contentProfile ?? contentProfile,
    topicId: article.topicId ?? topic.id,
    topicCluster: article.topicCluster ?? topic.topicCluster,
    writingProvider,
    liveData: Boolean(article.liveData ?? topic.liveData),
    ...(imageMeta ?? {}),
    ...(imageMeta
      ? (() => {
          const alts = buildCoverAlts(imageContext);
          return { coverImageAlt: alts.en, coverImageAltKo: alts.ko };
        })()
      : {}),
  };

  writePost(slug, "en", buildFrontmatter("en", article.en, shared), article.en.body);
  writePost(slug, "ko", buildFrontmatter("ko", article.ko, shared), article.ko.body);

  const issues = validatePostFiles(slug, {
    phase: "draft",
    applyRepair: true,
  }).filter((issue) => !/missing coverImage/i.test(issue));
  // Cover may be filled later by ensureCoverImage / GHA "Fetch missing draft covers".
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

