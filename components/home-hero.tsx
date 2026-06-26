import Image from "next/image";
import { CONTENT_SHELL } from "@/lib/layout";
import { siteConfig } from "@/lib/site";

type HomeHeroProps = {
  description: string;
};

export function HomeHero({ description }: HomeHeroProps) {
  return (
    <section className="relative mb-10 w-full overflow-hidden border-b border-border/60 sm:mb-12">
      <Image
        src="/images/hero/tech-art.jpg"
        alt=""
        width={1920}
        height={820}
        className="h-[48vw] min-h-[240px] w-full max-h-[560px] object-cover object-center sm:min-h-[280px] lg:max-h-[640px]"
        priority
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-end">
        <div className={`flex w-full items-end ${CONTENT_SHELL} pb-8 sm:pb-10 md:pb-12`}>
          <h1 className="sr-only">{siteConfig.name}</h1>
          <p className="max-w-3xl font-sans text-sm leading-relaxed text-white/90 sm:text-base md:text-lg lg:text-xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
