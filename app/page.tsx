import type { Metadata } from "next";
import { PostCard } from "@/components/post-card";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈",
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <section className="mb-12 border-b border-border/60 pb-12">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {siteConfig.name}
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground">
          {siteConfig.description}
        </p>
      </section>

      <section aria-labelledby="latest-posts-heading">
        <h2
          id="latest-posts-heading"
          className="mb-6 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          최신 글 ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center font-sans text-sm text-muted-foreground">
            아직 게시된 글이 없습니다.
            <br />
            <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-xs">
              content/posts/*.md
            </code>
            파일을 추가한 뒤 페이지를 새로고침하세요.
          </p>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
