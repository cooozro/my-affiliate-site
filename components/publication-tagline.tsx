import type { Locale } from "@/lib/i18n/config";
import { publicationTagline } from "@/lib/publication-copy";

type PublicationTaglineProps = {
  locale: Locale;
  className?: string;
};

export function PublicationTagline({
  locale,
  className = "",
}: PublicationTaglineProps) {
  return (
    <p
      className={`w-full border-t border-border/50 px-2 pt-8 text-center font-sans text-sm leading-relaxed text-balance text-muted-foreground sm:px-4 sm:pt-10 sm:text-[0.9375rem] ${className}`.trim()}
    >
      {publicationTagline[locale]}
    </p>
  );
}
