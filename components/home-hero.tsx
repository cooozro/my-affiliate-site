import Image from "next/image";
import { siteConfig } from "@/lib/site";

type HomeHeroProps = {
  description: string;
};

export function HomeHero({ description }: HomeHeroProps) {
  return (
    <section className="relative mb-12 overflow-hidden rounded-2xl border border-border/60">
      <Image
        src="/images/hero/tech-art.jpg"
        alt=""
        width={1600}
        height={900}
        className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
        priority
        sizes="(max-width: 768px) 100vw, 768px"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-10">
        <p className="mb-2 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-300/90 sm:text-xs">
          TECH + ART
        </p>
        <h1 className="max-w-xl font-serif text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
          {siteConfig.name}
        </h1>
        <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-white/85 sm:text-base md:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
