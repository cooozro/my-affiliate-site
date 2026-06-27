"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

const URL_SYNC_DELAY_MS = 350;

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

function HomePostListContent({ posts, locale, labels }: HomePostListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const isComposingRef = useRef(false);
  const skipUrlEchoRef = useRef(false);

  // Home / back-forward: apply URL to the input without fighting IME.
  useEffect(() => {
    if (skipUrlEchoRef.current) {
      skipUrlEchoRef.current = false;
      return;
    }
    if (isComposingRef.current) return;
    setQuery(urlQuery);
  }, [urlQuery]);

  const pushQueryToUrl = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const current = searchParams.get("q") ?? "";
      if (trimmed === current) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      skipUrlEchoRef.current = true;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounce URL updates so Korean IME composition is not interrupted.
  useEffect(() => {
    if (isComposingRef.current) return;

    const timer = window.setTimeout(() => {
      pushQueryToUrl(query);
    }, URL_SYNC_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [query, pushQueryToUrl]);

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
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            setQuery(e.currentTarget.value);
          }}
          onBlur={() => {
            isComposingRef.current = false;
          }}
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

function HomePostListFallback({ labels }: Pick<HomePostListProps, "labels">) {
  return (
    <div
      className="mb-6 h-12 animate-pulse rounded-xl border border-border bg-muted/50"
      aria-hidden
    >
      <span className="sr-only">{labels.searchLabel}</span>
    </div>
  );
}

export function HomePostList(props: HomePostListProps) {
  return (
    <Suspense fallback={<HomePostListFallback labels={props.labels} />}>
      <HomePostListContent {...props} />
    </Suspense>
  );
}
