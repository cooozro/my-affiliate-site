import { CONTENT_SHELL } from "@/lib/layout";
import { siteConfig } from "@/lib/site";

type HomeHeroProps = {
  description: string;
};

export function HomeHero({ description }: HomeHeroProps) {
  return (
    <section className="relative mb-10 w-full overflow-hidden border-b border-border/60 sm:mb-12">
      <video
        className="h-[48vw] min-h-[240px] w-full max-h-[560px] object-cover object-center sm:min-h-[280px] lg:max-h-[640px]"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/hero/hero-poster.jpg"
        aria-hidden
      >
        <source src="/images/hero/hero-loop.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-end">
        <div className={`flex w-full items-end ${CONTENT_SHELL} pb-8 sm:pb-10 md:pb-12`}>
          <h1 className="sr-only">{siteConfig.name}</h1>
          <p className="w-full max-w-full text-pretty font-sans text-[0.9375rem] leading-snug text-white/90 sm:text-base sm:leading-relaxed md:text-lg lg:max-w-none lg:text-xl lg:leading-relaxed xl:text-[1.375rem]">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
