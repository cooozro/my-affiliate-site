import "server-only";

import {
  liveDataDisclaimer,
  resolveContentPlaceholders,
} from "@/lib/content-vars";
import type { Locale } from "@/lib/i18n/config";
import { getUsdKrwRate } from "@/lib/market-data";
import type { Post } from "@/lib/posts";

export type EnrichedPost = Post & {
  liveDataNote?: string;
};

export async function enrichPost(
  post: Post,
  locale: Locale,
): Promise<EnrichedPost> {
  if (!post.liveData) {
    return post;
  }

  const market = await getUsdKrwRate();

  return {
    ...post,
    content: resolveContentPlaceholders(post.content, { locale, market }),
    liveDataNote: liveDataDisclaimer(locale, market),
  };
}
