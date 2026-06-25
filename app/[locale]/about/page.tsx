import type { Metadata } from "next";
import Link from "next/link";
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
        <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
          AI Pick &amp; Report는 소비자 전자기기 시장에 대한 객관적이고 기술
          중심의 실용적 인사이트를 제공하는 데이터 기반 매체입니다. 투명한
          데이터와 정직한 분석을 통해 현명한 구매 결정이 이루어진다고
          믿습니다.
        </p>

        <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              우리의 미션
            </h2>
            <p className="text-muted-foreground">
              복잡한 IT 시장을 일반 사용자에게 쉽게 전달하는 것이 우리의
              미션입니다. 구조화된 제품 데이터와 실사용 성능 지표를 바탕으로
              독자가 진정한 가치를 제공하는 기술을 찾을 수 있도록 돕습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              방법론: 데이터 우선 접근
            </h2>
            <p className="text-muted-foreground">
              마케팅 문구를 배제하고, 제품 스펙·가격 추이·사용자 경험 지표를
              엄격히 분석합니다. 배터리 수명, 코덱 지원, 장기 신뢰성 등
              트레이드오프를 명확한 비교 형식으로 제시합니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              편집 독립성과 투명성
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">독립적 분석:</strong>{" "}
                추천은 기술 분석과 성능 데이터에만 근거합니다.
              </li>
              <li>
                <strong className="text-foreground">제휴 투명성:</strong>{" "}
                제휴 링크는 명확히 공개하며, 편집 판단에 영향을 주지 않습니다.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              다루는 주제
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>모바일: 스마트폰, 태블릿, 액세서리</li>
              <li>오디오 &amp; 웨어러블: 무선 이어폰, 스마트 기기</li>
              <li>스마트홈 &amp; 가전: 생산성을 높이는 홈 테크</li>
              <li>구매 가이드: 예산별 가성비 비교</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              문의하기
            </h2>
            <p className="text-muted-foreground">
              리뷰 관련 질문이나 제안이 있으시면{" "}
              <Link
                href={localizedPath(locale, "/contact")}
                className="font-medium text-accent hover:underline"
              >
                문의 페이지
              </Link>
              를 이용해 주세요.
            </p>
          </div>
        </section>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        About AI Pick &amp; Report
      </h1>
      <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
        AI Pick &amp; Report is a data-driven publication dedicated to providing
        objective, technical, and practical insights into the rapidly evolving
        world of consumer electronics. We believe that informed purchase
        decisions are built on transparent data and honest analysis, not
        marketing hype.
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Our Mission
          </h2>
          <p className="text-muted-foreground">
            Our mission is to simplify the complex tech market for everyday
            users. By curating structured product data and real-world performance
            metrics, we help our readers navigate through the noise to find
            technology that offers genuine value.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Our Methodology: Data-First Approach
          </h2>
          <p className="text-muted-foreground">
            We strip away the marketing fluff. Our editorial process begins with
            rigorous analysis of product specifications, pricing trends, and user
            experience metrics. We present this information in a clear, comparative
            format, enabling our readers to weigh trade-offs—such as battery life,
            codec support, and long-term reliability—before making a purchase.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Editorial Integrity &amp; Transparency
          </h2>
          <p className="mb-3 text-muted-foreground">
            Trust is the foundation of our work.
          </p>
          <ul className="list-disc space-y-3 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Independent Analysis:</strong>{" "}
              Our recommendations are based solely on technical analysis and
              performance data.
            </li>
            <li>
              <strong className="text-foreground">Affiliate Transparency:</strong>{" "}
              We may include affiliate links to help sustain this publication.
              These links are disclosed clearly and do not influence our editorial
              judgment. We prioritize the reader&apos;s interest above any
              potential commission.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            What We Cover
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Mobile Technology:</strong>{" "}
              Smartphones, tablets, and mobile accessories.
            </li>
            <li>
              <strong className="text-foreground">Audio &amp; Wearables:</strong>{" "}
              Wireless headphones, earbuds, and smart wearables.
            </li>
            <li>
              <strong className="text-foreground">Smart Home &amp; Appliances:</strong>{" "}
              Efficient gadgets and home tech that enhance daily productivity.
            </li>
            <li>
              <strong className="text-foreground">Buying Guides:</strong>{" "}
              Comprehensive comparisons designed to find the best value for your
              budget.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Contact Us
          </h2>
          <p className="text-muted-foreground">
            We value your feedback and inquiries. If you have questions about our
            reviews or suggestions for future topics, please feel free to reach
            out to us at{" "}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-medium text-accent hover:underline"
            >
              {siteConfig.contactDisplayEmail}
            </a>{" "}
            or visit our{" "}
            <Link
              href={localizedPath(locale, "/contact")}
              className="font-medium text-accent hover:underline"
            >
              contact page
            </Link>
            .
          </p>
        </div>
      </section>
    </article>
  );
}
