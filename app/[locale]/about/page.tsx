import type { Metadata } from "next";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return {
    title: dict.about.title,
    description: dict.about.metaDescription,
    alternates: {
      canonical: `${siteConfig.url}${localizedPath(locale, "/about")}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `${siteConfig.url}${localizedPath(l, "/about")}`]),
      ),
    },
    openGraph: {
      title: dict.about.title,
      description: dict.about.metaDescription,
      url: `${siteConfig.url}${localizedPath(locale, "/about")}`,
      locale: ogLocales[locale],
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;

  if (locale === "ko") {
    return (
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          AI Pick &amp; Report 소개
        </h1>
        <p className="mt-4 font-sans text-lg text-muted-foreground">
          데이터 기반 IT 제품 리뷰 및 구매 가이드 전문 매체입니다.
        </p>
        <section className="mt-10 space-y-6 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
          <p>
            AI Pick &amp; Report는 스마트폰, 가전, 전자기기를 스펙·가격·사용
            시나리오 데이터로 분석하는 독립 리뷰 사이트입니다.
          </p>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            우리의 미션
          </h2>
          <p>
            마케팅 문구가 아닌 검증 가능한 데이터로 소비자가 현명한 구매 결정을
            내릴 수 있도록 돕습니다.
          </p>
        </section>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        About AI Pick &amp; Report
      </h1>
      <p className="mt-4 font-sans text-lg text-muted-foreground">
        An independent publication dedicated to data-backed tech reviews and
        practical buying guides.
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Who We Are
          </h2>
          <p>
            AI Pick &amp; Report is an editorial team focused on consumer
            electronics — smartphones, audio gear, smart home devices, and
            everyday tech. We analyze specifications, pricing trends, and
            real-world use cases so readers can make informed purchase decisions.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Our Methodology
          </h2>
          <p>
            Every guide starts with structured product data: chipset specs,
            battery metrics, codec support, pricing history, and verified user
            feedback. We compare products side-by-side in markdown tables and
            explain trade-offs in plain language — no hype, no filler.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Editorial Independence
          </h2>
          <p>
            Our recommendations are based on analysis, not paid placement.
            When affiliate links are present, they are clearly disclosed. We
            prioritize reader trust and long-term value over short-term
            commissions.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            What We Cover
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Smartphones and mobile accessories</li>
            <li>Wireless audio and wearables</li>
            <li>Home appliances and smart devices</li>
            <li>Value-for-money tech buying guides</li>
          </ul>
        </div>
      </section>
    </article>
  );
}
