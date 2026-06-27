"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { PostMeta } from "@/lib/posts";
import type { Dictionary } from "@/messages/en";
import { PostCard } from "@/components/post-card";
import { PostThumbnail } from "@/components/post-thumbnail";

type HomePostListProps = {
  posts: PostMeta[];
  locale: Locale;
  labels: Dictionary["home"];
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function matchesPost(post: PostMeta, query: string) {
  if (!query) return true;
  const haystack = [post.title, post.description, ...(post.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function HomePostList({ posts, locale, labels }: HomePostListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return posts;
    return posts.filter((post) => matchesPost(post, q));
  }, [posts, query]);

  const featured = filtered[0];
  const gridPosts = filtered.slice(1, 11);
  const thumbPosts = filtered.slice(11);

  return (
    <>
      <div className="mb-6">
        <label htmlFor="home-post-search" className="sr-only">
          {labels.searchLabel}
        </label>
        <input
          id="home-post-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-sans text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
          autoComplete="off"
        />
      </div>

      <h2
        id="latest-posts-heading"
        className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {labels.latestPosts} ({filtered.length})
      </h2>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center font-sans text-sm text-muted-foreground">
          {labels.searchNoResults}
        </p>
      ) : (
        <div className="space-y-8">
          {featured ? (
            <PostCard
              post={featured}
              locale={locale}
              readMoreLabel={labels.readMore}
              variant="featured"
            />
          ) : null}

          {gridPosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {gridPosts.map((post) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  locale={locale}
                  readMoreLabel={labels.readMore}
                  variant="compact"
                />
              ))}
            </div>
          ) : null}

          {thumbPosts.length > 0 ? (
            <section aria-labelledby="archive-thumbs-heading">
              <h3
                id="archive-thumbs-heading"
                className="mb-4 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {labels.moreArticles}
              </h3>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {thumbPosts.map((post) => (
                  <PostThumbnail key={post.slug} post={post} locale={locale} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
