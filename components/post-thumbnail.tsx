import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/paths";
import type { PostMeta } from "@/lib/posts";

type PostThumbnailProps = {
  post: PostMeta;
  locale: Locale;
};

export function PostThumbnail({ post, locale }: PostThumbnailProps) {
  const href = localizedPath(locale, `/blog/${post.slug}`);

  return (
    <Link
      href={href}
      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition hover:border-accent/50 hover:shadow-sm"
      title={post.title}
    >
      {post.coverImage ? (
        <Image
          src={post.coverImage}
          alt={post.coverImageAlt ?? post.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 20vw, 10vw"
        />
      ) : (
        <span className="flex h-full items-center justify-center px-1 text-center font-sans text-[10px] leading-tight text-muted-foreground">
          {post.title}
        </span>
      )}
      <span className="sr-only">{post.title}</span>
    </Link>
  );
}
