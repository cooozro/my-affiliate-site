import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import type { PostMeta } from "@/lib/posts";
import type { Dictionary } from "@/messages/en";

type PostCardProps = {
  post: PostMeta;
  locale: Locale;
  readMoreLabel: Dictionary["home"]["readMore"];
  variant?: "featured" | "default" | "compact";
};

function formatDate(post: PostMeta, locale: Locale) {
  const iso = post.publishedAt ?? post.date;
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function PostCard({
  post,
  locale,
  readMoreLabel,
  variant = "default",
}: PostCardProps) {
  const href = localizedPath(locale, `/blog/${post.slug}`);
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-accent/40 hover:shadow-sm">
      <div
        className={
          isFeatured
            ? "flex flex-col"
            : "flex flex-col sm:flex-row"
        }
      >
        {post.coverImage ? (
          <Link
            href={href}
            className={
              isFeatured
                ? "relative block aspect-[21/9] w-full overflow-hidden"
                : isCompact
                  ? "relative block shrink-0 overflow-hidden sm:w-36"
                  : "relative block shrink-0 overflow-hidden sm:w-44 md:w-52"
            }
            tabIndex={-1}
            aria-hidden
          >
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt ?? post.title}
              width={isFeatured ? 1200 : 416}
              height={isFeatured ? 514 : 234}
              className={
                isFeatured
                  ? "h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  : "aspect-[16/9] h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:aspect-auto sm:h-full sm:min-h-[9.5rem]"
              }
              sizes={
                isFeatured
                  ? "100vw"
                  : isCompact
                    ? "(max-width: 640px) 100vw, 144px"
                    : "(max-width: 640px) 100vw, 208px"
              }
            />
          </Link>
        ) : null}

        <div
          className={`flex min-w-0 flex-1 flex-col ${isCompact ? "p-4 sm:p-4" : "p-5 sm:p-6"}`}
        >
          <time
            dateTime={post.publishedAt ?? post.date}
            className="font-sans text-xs text-muted-foreground"
          >
            {formatDate(post, locale)}
          </time>
          <h2
            className={`mt-2 font-serif font-bold leading-snug text-foreground group-hover:text-accent ${
              isFeatured ? "text-2xl sm:text-3xl" : isCompact ? "text-lg" : "text-xl"
            }`}
          >
            <Link href={href} className="outline-offset-4">
              {post.title}
            </Link>
          </h2>
          {post.description ? (
            <p
              className={`mt-3 font-sans leading-relaxed text-muted-foreground ${
                isFeatured
                  ? "line-clamp-3 text-sm sm:text-base"
                  : isCompact
                    ? "line-clamp-2 text-sm"
                    : "line-clamp-2 text-sm sm:line-clamp-3"
              }`}
            >
              {post.description}
            </p>
          ) : null}
          <Link
            href={href}
            className="mt-4 inline-flex font-sans text-sm font-medium text-accent transition hover:underline"
            aria-label={`${readMoreLabel}: ${post.title}`}
          >
            {readMoreLabel} →
          </Link>
        </div>
      </div>
    </article>
  );
}
