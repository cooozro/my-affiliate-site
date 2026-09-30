import "server-only";

import {
  hasFreeTranslateConfig,
  translatePostFields,
} from "../scripts/automation/free-translate.mjs";

export { hasFreeTranslateConfig };

/** KO → EN 번역 (Gemini Free → Google Cloud Translate). DeepSeek/OpenAI 사용 안 함. */
export async function translateManualPostKoToEn(input: {
  titleKo: string;
  descriptionKo?: string;
  bodyKo: string;
  tagsKo?: string[];
}): Promise<{
  titleEn: string;
  descriptionEn: string;
  bodyEn: string;
  tagsEn: string[];
  provider?: string;
  model?: string;
}> {
  const result = await translatePostFields({
    direction: "ko-to-en",
    title: input.titleKo,
    description: input.descriptionKo,
    body: input.bodyKo,
    tags: input.tagsKo,
  });
  return {
    titleEn: result.titleEn,
    descriptionEn: result.descriptionEn,
    bodyEn: result.bodyEn,
    tagsEn: result.tagsEn,
    provider: result.provider,
    model: result.model,
  };
}

/** EN → KO 번역 (Gemini Free → Google Cloud Translate). */
export async function translateManualPostEnToKo(input: {
  titleEn: string;
  descriptionEn?: string;
  bodyEn: string;
  tagsEn?: string[];
}): Promise<{
  titleKo: string;
  descriptionKo: string;
  bodyKo: string;
  tagsKo: string[];
  provider?: string;
  model?: string;
}> {
  const result = await translatePostFields({
    direction: "en-to-ko",
    title: input.titleEn,
    description: input.descriptionEn,
    body: input.bodyEn,
    tags: input.tagsEn,
  });
  return {
    titleKo: result.titleKo,
    descriptionKo: result.descriptionKo,
    bodyKo: result.bodyKo,
    tagsKo: result.tagsKo,
    provider: result.provider,
    model: result.model,
  };
}
