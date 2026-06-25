import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

type PostCardProps = {
  post: PostMeta;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-accent/40 hover:shadow-sm">
      <time
        dateTime={post.date}
        className="font-sans text-xs text-muted-foreground"
      >
        {formatDate(post.date)}
      </time>
      <h2 className="mt-2 font-serif text-xl font-bold leading-snug text-foreground group-hover:text-accent">
        <Link href={`/blog/${post.slug}`} className="outline-offset-4">
          {post.title}
        </Link>
      </h2>
      {post.description ? (
        <p className="mt-3 line-clamp-3 font-sans text-sm leading-relaxed text-muted-foreground">
          {post.description}
        </p>
      ) : null}
      <Link
        href={`/blog/${post.slug}`}
        className="mt-4 inline-flex font-sans text-sm font-medium text-accent transition hover:underline"
        aria-label={`${post.title} 읽기`}
      >
        글 읽기 →
      </Link>
    </article>
  );
}
