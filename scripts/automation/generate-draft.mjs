import { buildGenerationPrompt } from "./prompts.mjs";
import { chatJsonCompletion } from "./llm-chat.mjs";
import { buildWriterSystemPrompt } from "./writer-system-prompt.mjs";
import { pickTopic } from "./topics.mjs";
import { fetchCoverImage } from "./fetch-image.mjs";
import fs from "fs";
import path from "path";
import { fetchAdditionalImages } from "../lib/cover-image.mjs";
import { repairModelDeepDiveBody } from "../lib/repair-model-deep-dive-body.mjs";
import { imageRefExists } from "../lib/draft-image-integrity.mjs";
import {
  buildModelDeepDiveAlts,
  buildModelDeepDiveSearchQueries,
  insertModelDeepDiveBodyImages,
} from "../lib/model-deep-dive-images.mjs";
import {
  fetchPressKitImages,
  mergePressAndStockFigures,
} from "../lib/press-kit-images.mjs";
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
import { pickContentProfile, getTemplatePath, CONTENT_PROFILES } from "../lib/content-profiles.mjs";
import {
  pickPopularModels,
  recordModelPick,
} from "../lib/popular-model-picks.mjs";
import { buildCoverAlts, resolveImageContext } from "../lib/image-query.mjs";
import { ensureImageApiEnv } from "../lib/image-api-env.mjs";
import {
  MAX_PUBLISH_PER_DAY,
  TARGET_DRAFT_COUNT,
} from "../lib/publish-schedule.mjs";
import { getCurrentSeason, isTopicInSeason, SEASONAL_ONLY_TOPIC_IDS } from "../lib/season-topics.mjs";

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
    ...(shared.modelPickId ? { modelPickId: shared.modelPickId } : {}),
    ...(shared.modelPickBrand ? { modelPickBrand: shared.modelPickBrand } : {}),
    ...(shared.modelPickName ? { modelPickName: shared.modelPickName } : {}),
    ...(shared.pressKitGallery ? { pressKitGallery: shared.pressKitGallery } : {}),
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
  const profilesToTry = [
    contentProfile,
    ...CONTENT_PROFILES.filter((p) => p !== contentProfile),
  ];

  let lastError = null;
  for (const profile of profilesToTry) {
    try {
      const topic = pickTopic(state, { contentProfile: profile });
      return await generateDraftForTopic(topic, profile, { bypassWriteCap, state });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No topics available for any content profile");
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
  if (
    SEASONAL_ONLY_TOPIC_IDS.has(topic.id) &&
    !isTopicInSeason(topic)
  ) {
    const season = getCurrentSeason();
    throw new Error(
      `Off-season topic blocked: ${topic.id} is not eligible in ${season} (KST)`,
    );
  }
  const state = inputState ?? loadState();
  const year = new Date().getFullYear();

  let modelPick = null;
  if (contentProfile === "model-deep-dive") {
    modelPick = pickPopularModels(topic.id, { state });
    if (!modelPick?.primary) {
      throw new Error(
        `No popular-model catalog for topic ${topic.id} (model-deep-dive)`,
      );
    }
    console.log(
      `Model deep-dive pick: ${modelPick.primary.brand} ${modelPick.primary.name}` +
        (modelPick.rival ? ` vs ${modelPick.rival.brand} ${modelPick.rival.name}` : ""),
    );
  }

  const prompt = buildGenerationPrompt(topic, year, contentProfile, {
    writingMode: options.writingMode,
    toneVariant: options.toneVariant,
    benchmarkOutline: options.benchmarkOutline,
    modelPick,
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

  const slugBase = modelPick?.primary
    ? `${year}-${topic.id}-${modelPick.primary.id}-review`
    : `${year}-${topic.id}-guide`;
  const slug = uniqueSlug(article.slug ?? slugBase);
  const createdAt = new Date().toISOString();
  const date = kstDateString();

  const imageInput = {
    title: article.en?.title,
    tags: article.en?.tags ?? article.tags,
    imageQuery: article.imageQuery ?? topic.imageQuery,
    imageSearchKeywords: topic.imageSearchKeywords,
    topicCluster: topic.topicCluster ?? topic.category,
    topic,
    topicId: topic.id,
  };

  // Model deep-dive: bias cover search toward category product-cut stock (not OEM scrapes).
  if (contentProfile === "model-deep-dive" && modelPick?.primary) {
    const queries = buildModelDeepDiveSearchQueries(modelPick.primary, topic);
    imageInput.imageQuery = queries[0];
    imageInput.imageSearchKeywords = queries;
    imageInput.tags = [
      ...(imageInput.tags ?? []),
      modelPick.primary.brand,
      modelPick.primary.name,
      "product photo",
    ];
  }

  const imageContext = resolveImageContext(slug, imageInput);

  /** @type {Awaited<ReturnType<typeof fetchPressKitImages>>['images']} */
  let pressImages = [];
  /** @type {Awaited<ReturnType<typeof fetchPressKitImages>>['entry']} */
  let pressEntry = null;
  // Prefer official press-kit for any profile when a named model is available;
  // head-to-head / buying-guide also benefit (fetchCoverImage retries official first).
  if (modelPick?.primary) {
    try {
      const press = await fetchPressKitImages(slug, modelPick.primary, {
        count: contentProfile === "model-deep-dive" ? 2 : 1,
        preferRoles: ["cover", "lifestyle", "detail"],
      });
      pressEntry = press.entry;
      pressImages = press.images;
    } catch (err) {
      console.warn(`Press-kit fetch skipped: ${err.message}`);
    }
  } else if (article.en?.title) {
    // head-to-head titles often encode brand+model ("JBL Flip 7 vs …")
    imageInput.title = article.en.title;
  }

  const pressCover = pressImages.find((p) => p.role === "cover") ?? pressImages[0];
  let imageMeta = null;
  if (pressCover) {
    imageMeta = {
      coverImage: pressCover.path,
      coverImageAlt: pressCover.altEn,
      coverImageAltKo: pressCover.altKo,
      coverImageCredit: pressCover.credit,
      coverImageProvider: "press-kit",
      coverImageAssetId: pressCover.assetId,
      coverImageSourceUrl: pressCover.sourceUrl,
      imageSearchKeywords: imageInput.imageSearchKeywords,
    };
    console.log(`Cover from press kit: ${pressCover.path}`);
  } else {
    imageMeta = await fetchCoverImage(slug, imageInput);
  }

  let enBody = article.en.body;
  let koBody = article.ko.body;

  if (contentProfile === "model-deep-dive" && modelPick?.primary) {
    const bodyQueries = buildModelDeepDiveSearchQueries(modelPick.primary, topic);
    const bodyInput = {
      ...imageInput,
      imageQuery: bodyQueries[1] ?? bodyQueries[0],
      imageSearchKeywords: bodyQueries,
    };
    try {
      const needStock = Math.max(
        0,
        2 - pressImages.filter((p) => p.path !== pressCover?.path).length,
      );
      let stockFigures = [];
      if (needStock > 0) {
        const extras = await fetchAdditionalImages(slug, bodyInput, {
          count: needStock,
          filenamePrefix: "body",
          skipCurated: true,
        });
        const roles = ["lifestyle", "detail"];
        stockFigures = extras.map((img, i) => {
          const alts = buildModelDeepDiveAlts(
            modelPick.primary,
            topic.id,
            roles[i] ?? "detail",
          );
          return {
            path: img.path,
            altEn: alts.en,
            altKo: alts.ko,
            credit: img.credit,
            source: "stock",
          };
        });
      }
      const pressForBody = pressImages.filter((p) => p.path !== pressCover?.path);
      let figures = mergePressAndStockFigures(pressForBody, stockFigures, 2);
      if (figures.length === 0 && stockFigures.length > 0) {
        figures = [...stockFigures];
      }
      if (figures.length > 0) {
        enBody = insertModelDeepDiveBodyImages(enBody, figures, "en", {
          coverImage: imageMeta?.coverImage || pressCover?.path,
        });
        koBody = insertModelDeepDiveBodyImages(koBody, figures, "ko", {
          coverImage: imageMeta?.coverImage || pressCover?.path,
        });
        console.log(
          `Model-deep-dive body images: ${figures.length} (press=${figures.filter((f) => f.source === "press-kit").length}, stock=${figures.filter((f) => f.source === "stock").length})`,
        );
      }
    } catch (err) {
      console.warn(`Body image enrich skipped: ${err.message}`);
    }
  }

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
          if (contentProfile === "model-deep-dive" && modelPick?.primary) {
            if (imageMeta.coverImageProvider === "press-kit") {
              return {
                coverImageAlt: imageMeta.coverImageAlt,
                coverImageAltKo: imageMeta.coverImageAltKo,
              };
            }
            const alts = buildModelDeepDiveAlts(
              modelPick.primary,
              topic.id,
              "cover",
            );
            const base = buildCoverAlts(imageContext);
            return {
              coverImageAlt: `${alts.en} — ${base.en}`.slice(0, 200),
              coverImageAltKo: `${alts.ko} — ${base.ko}`.slice(0, 200),
            };
          }
          const alts = buildCoverAlts(imageContext);
          return { coverImageAlt: alts.en, coverImageAltKo: alts.ko };
        })()
      : {}),
    ...(modelPick?.primary
      ? {
          modelPickId: modelPick.primary.id,
          modelPickBrand: modelPick.primary.brand,
          modelPickName: modelPick.primary.name,
        }
      : {}),
    ...(pressEntry?.galleryUrl
      ? { pressKitGallery: pressEntry.galleryUrl }
      : {}),
  };

  const enFm = buildFrontmatter("en", article.en, shared);
  const koFm = buildFrontmatter("ko", article.ko, shared);

  const siteRoot = process.cwd();
  if (!shared.coverImage || !imageRefExists(siteRoot, shared.coverImage)) {
    throw new Error(
      `Cover image not on disk for ${slug} — draft aborted (phantom coverImage forbidden)`,
    );
  }

  enBody = repairModelDeepDiveBody(enFm, enBody, "en", { root: siteRoot }).body;
  koBody = repairModelDeepDiveBody(koFm, koBody, "ko", { root: siteRoot }).body;

  writePost(slug, "en", enFm, enBody);
  writePost(slug, "ko", koFm, koBody);

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
  if (modelPick?.primary) {
    recordModelPick(state, topic.id, modelPick.primary.id);
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

