import Image from "next/image";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  h2: ({ children, ...props }) => (
    <h2
      className="mb-4 mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-3 mt-8 font-serif text-xl font-semibold leading-snug text-foreground"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p
      className="mb-6 font-serif text-[1.0625rem] leading-[1.85] text-foreground/90"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-6 list-disc space-y-2 pl-6 font-serif text-[1.0625rem] leading-[1.85] text-foreground/90"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-6 list-decimal space-y-2 pl-6 font-serif text-[1.0625rem] leading-[1.85] text-foreground/90"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition hover:decoration-accent"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mb-6 border-l-4 border-accent/40 pl-5 font-serif italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table
        className="w-full min-w-[32rem] border-collapse font-sans text-xs leading-snug text-foreground/90 sm:min-w-0 sm:text-sm sm:leading-normal"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-border bg-muted px-2 py-2 text-left align-top font-semibold sm:px-4 sm:py-2.5"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="break-words border border-border px-2 py-2 align-top sm:px-4 sm:py-2.5"
      {...props}
    >
      {children}
    </td>
  ),
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string") {
      return null;
    }

    return (
      <span className="my-8 block overflow-hidden rounded-xl border border-border/60">
        <Image
          src={src}
          alt={alt ?? ""}
          width={1200}
          height={675}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </span>
    );
  },
  hr: (props) => <hr className="my-10 border-border" {...props} />,
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");

    if (isBlock) {
      return (
        <code
          className={`${className} block overflow-x-auto rounded-lg bg-muted px-4 py-3 font-mono text-sm`}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre className="mb-6 overflow-x-auto rounded-lg bg-muted" {...props}>
      {children}
    </pre>
  ),
};

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className={`prose-custom ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
