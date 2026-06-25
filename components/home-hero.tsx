import Image from "next/image";
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
        className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-6xl px-6 pb-8 pt-20 sm:px-10 sm:pb-10 md:pb-12 lg:px-12">
          <p className="mb-2 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-300/90 sm:text-xs">
            TECH + ART
          </p>
          <h1 className="max-w-3xl font-serif text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {siteConfig.name}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/88 sm:text-base md:text-lg lg:text-xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
