import { MarkdownContent } from "@/components/markdown-content";
import type { Locale } from "@/lib/i18n/config";
import type { Post } from "@/lib/posts";

type ArticleLayoutProps = {
  post: Post;
  locale: Locale;
};

function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function ArticleLayout({ post, locale }: ArticleLayoutProps) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-border/60 pb-10">
        <time
          dateTime={post.date}
          className="font-sans text-sm text-muted-foreground"
        >
          {formatDate(post.date, locale)}
        </time>
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

      <div className="article-body">
        <MarkdownContent content={post.content} />
      </div>
    </article>
  );
}
