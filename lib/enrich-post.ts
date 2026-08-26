import "server-only";

import fs from "fs";
import path from "path";

import {
  liveDataDisclaimer,
  resolveContentPlaceholders,
} from "@/lib/content-vars";
import type { Locale } from "@/lib/i18n/config";
import { getUsdKrwRate } from "@/lib/market-data";
import type { Post } from "@/lib/posts";
import {
  sanitizePipelineArtifacts,
  stripMethodologySections,
} from "@/lib/site-engine";

export type EnrichedPost = Post & {
  liveDataNote?: string;
};

function resolveCoverImageSrc(post: Post): string | undefined {
  const local = post.coverImage?.trim();
  const source = post.coverImageSourceUrl?.trim();
  if (local?.startsWith("http://") || local?.startsWith("https://")) {
    return local;
  }
  if (local?.startsWith("/images/")) {
    const disk = path.join(process.cwd(), "public", local.replace(/^\//, ""));
    if (fs.existsSync(disk)) return local;
    if (source?.startsWith("http")) return source;
    return local;
  }
  return local || source;
}

export async function enrichPost(
  post: Post,
  locale: Locale,
): Promise<EnrichedPost> {
  const coverImage = resolveCoverImageSrc(post);
  const base = coverImage && coverImage !== post.coverImage ? { ...post, coverImage } : post;
  const stripped = {
    ...base,
    content: sanitizePipelineArtifacts(stripMethodologySections(base.content)),
  };

  if (!base.liveData) {
    return stripped;
  }

  const market = await getUsdKrwRate();

  return {
    ...stripped,
    content: resolveContentPlaceholders(stripped.content, { locale, market }),
    liveDataNote: liveDataDisclaimer(locale, market),
  };
}
