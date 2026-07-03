import Image from "next/image";
import { ArticleProtection } from "@/components/article-protection";
import { ArticleShare } from "@/components/article-share";
import { MarkdownContent } from "@/components/markdown-content";
import { PublicationTagline } from "@/components/publication-tagline";
import {
  ARTICLE_CHROME_RULES,
  assertTaglinePlacement,
  splitArticleBodyForTagline,
} from "@/lib/guardian";
import { ARTICLE_SHELL } from "@/lib/layout";
import type { EnrichedPost } from "@/lib/enrich-post";
import type { Locale } from "@/lib/i18n/config";
import { siteConfig } from "@/lib/site";
import type { Dictionary } from "@/messages/en";

type ArticleLayoutProps = {
  post: EnrichedPost;
  locale: Locale;
  shareUrl: string;
  shareLabels: Dictionary["blog"]["share"];
  dateLabels: Pick<Dictionary["blog"], "published" | "updated">;
};

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(date));
}

function ShareBar({
  placement,
  shareUrl,
  post,
  shareImageUrl,
  feedUrl,
  shareLabels,
}: {
  placement: "top" | "bottom";
  shareUrl: string;
  post: EnrichedPost;
  shareImageUrl?: string;
  feedUrl: string;
  shareLabels: Dictionary["blog"]["share"];
}) {
  return (
    <ArticleShare
      url={shareUrl}
      title={post.title}
      imageUrl={shareImageUrl}
      feedUrl={feedUrl}
      labels={shareLabels}
      variant={placement}
    />
  );
}

export function ArticleLayout({
  post,
  locale,
  shareUrl,
  shareLabels,
  dateLabels,
}: ArticleLayoutProps) {
  const shareImageUrl = post.coverImage
    ? `${siteConfig.url}${post.coverImage}`
    : undefined;
  const feedUrl = `${siteConfig.url}/${locale}/feed.xml`;

  const contentParts = splitArticleBodyForTagline(post.content, locale);
  if (contentParts) {
    assertTaglinePlacement("after-related-heading");
  }

  const publishedIso = post.publishedAt ?? post.date;
  const modifiedIso = post.updatedAt ?? publishedIso;
  const sharePlacements = ARTICLE_CHROME_RULES.shareBar.placements;

  return (
    <article className={ARTICLE_SHELL}>
      <header className="mb-6 border-b border-border/60 pb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-muted-foreground">
          <time dateTime={publishedIso}>
            {dateLabels.published}: {formatDate(publishedIso, locale)}
          </time>
          <time dateTime={modifiedIso}>
            {dateLabels.updated}: {formatDateTime(modifiedIso, locale)}
          </time>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        {post.description ? (
          <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
            {post.description}
          </p>
        ) : null}
        {post.tags && post.tags.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-muted px-3 py-1 font-sans text-xs text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {sharePlacements.includes("top") ? (
        <ShareBar
          placement="top"
          shareUrl={shareUrl}
          post={post}
          shareImageUrl={shareImageUrl}
          feedUrl={feedUrl}
          shareLabels={shareLabels}
        />
      ) : null}

      <ArticleProtection>
        {post.coverImage ? (
          <figure className="mb-10 overflow-hidden rounded-xl border border-border/60">
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt ?? post.title}
              width={1200}
              height={675}
              className="h-auto w-full object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              draggable={false}
            />
            {post.coverImageCredit ? (
              <figcaption className="border-t border-border/60 bg-muted/40 px-4 py-2 font-sans text-xs text-muted-foreground">
                {post.coverImageCredit}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {post.liveDataNote ? (
          <p className="mb-8 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 font-sans text-sm text-muted-foreground">
            {post.liveDataNote}
          </p>
        ) : null}

        <div className="article-body">
          {contentParts ? (
            <>
              <MarkdownContent content={contentParts.throughHeading} />
              <PublicationTagline locale={locale} variant="inline" />
              <MarkdownContent content={contentParts.relatedLinks} />
              <MarkdownContent content={contentParts.afterRelated} />
            </>
          ) : (
            <MarkdownContent content={post.content} />
          )}
        </div>
      </ArticleProtection>

      {sharePlacements.includes("bottom") ? (
        <ShareBar
          placement="bottom"
          shareUrl={shareUrl}
          post={post}
          shareImageUrl={shareImageUrl}
          feedUrl={feedUrl}
          shareLabels={shareLabels}
        />
      ) : null}
    </article>
  );
}
