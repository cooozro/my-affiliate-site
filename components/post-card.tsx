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
};

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function PostCard({ post, locale, readMoreLabel }: PostCardProps) {
  const href = localizedPath(locale, `/blog/${post.slug}`);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-accent/40 hover:shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {post.coverImage ? (
          <Link
            href={href}
            className="relative block shrink-0 overflow-hidden sm:w-44 md:w-52"
            tabIndex={-1}
            aria-hidden
          >
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt ?? post.title}
              width={416}
              height={234}
              className="aspect-[16/9] h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:aspect-auto sm:h-full sm:min-h-[9.5rem]"
              sizes="(max-width: 640px) 100vw, 208px"
            />
          </Link>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <time
            dateTime={post.date}
            className="font-sans text-xs text-muted-foreground"
          >
            {formatDate(post.date, locale)}
          </time>
          <h2 className="mt-2 font-serif text-xl font-bold leading-snug text-foreground group-hover:text-accent">
            <Link href={href} className="outline-offset-4">
              {post.title}
            </Link>
          </h2>
          {post.description ? (
            <p className="mt-3 line-clamp-2 font-sans text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
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
