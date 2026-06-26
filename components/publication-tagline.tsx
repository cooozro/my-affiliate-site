import type { Locale } from "@/lib/i18n/config";
import { publicationTagline } from "@/lib/publication-copy";

type PublicationTaglineProps = {
  locale: Locale;
  className?: string;
  /** inline = under Related guides heading; standalone = page/footer block */
  variant?: "inline" | "standalone";
};

export function PublicationTagline({
  locale,
  className = "",
  variant = "standalone",
}: PublicationTaglineProps) {
  const inlineClass =
    "mt-3 mb-5 font-sans text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]";
  const standaloneClass =
    "w-full border-t border-border/50 px-2 pt-8 text-center font-sans text-sm leading-relaxed text-balance text-muted-foreground sm:px-4 sm:pt-10 sm:text-[0.9375rem]";

  return (
    <p
      className={`${variant === "inline" ? inlineClass : standaloneClass} ${className}`.trim()}
    >
      {publicationTagline[locale]}
    </p>
  );
}
