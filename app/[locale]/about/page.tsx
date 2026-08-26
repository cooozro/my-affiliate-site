import type { Metadata } from "next";
import Link from "next/link";
import { PublicationTagline } from "@/components/publication-tagline";
import { ARTICLE_SHELL } from "@/lib/layout";
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
  const contactHref = localizedPath(locale, "/contact");

  if (locale === "ko") {
    return (
      <article className={ARTICLE_SHELL}>
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          AI Pick &amp; Report 소개
        </h1>
        <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
          AI Pick &amp; Report는 소비자 전자기기·가전 구매를 앞둔 독자가 마케팅
          문구와 공개 스펙을 구분할 수 있도록 돕는 데이터 기반 가이드 매체입니다.
          우리는 자체 실험실에서 실물 기기를 측정하는 리뷰 랩이 아니며, 제조사
          공개 스펙과 오픈된 사용자 리뷰를 교차 분석한 편집 가이드를 발행합니다.
        </p>

        <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              운영 목적
            </h2>
            <p className="text-muted-foreground">
              운영 목적은 단순합니다. 특정 판매처의 재고를 밀어 주는 것이 아니라,
              독자가 예산·공간·소음·3년 총소유비용 같은 실제 제약 안에서 시판
              모델을 비교할 수 있게 하는 것입니다. 글마다 섹션 순서를 바꿔 같은
              뼈대를 반복하지 않고, 명시한 모델과 공개 수치만으로 판단을
              남깁니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              데이터 분석 기준
            </h2>
            <p className="mb-3 text-muted-foreground">
              기사 본문에 반복되던 &ldquo;분석 방법론&rdquo; 상투 블록은 여기로
              모았습니다. 모든 리포트는 아래 출처만 사용합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-semibold text-foreground">항목</th>
                    <th className="py-2 pr-3 font-semibold text-foreground">출처</th>
                    <th className="py-2 font-semibold text-foreground">활용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">판매가</td>
                    <td className="py-2 pr-3">제조사·공식몰·주요 쇼핑몰 공시 가격</td>
                    <td className="py-2">참고가 비교. 실시간 시세는 공식 판매처 확인</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">제품 스펙</td>
                    <td className="py-2 pr-3">제조사 스펙시트·인증 문서</td>
                    <td className="py-2">정량 스펙 교차 검증</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3">사용자 평가</td>
                    <td className="py-2 pr-3">공개 리뷰 플랫폼의 오픈된 후기</td>
                    <td className="py-2">품질·소음·내구성 신호</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3">사용하지 않는 것</td>
                    <td className="py-2 pr-3">자체 실험실 측정, 비공개 판매자 API, 임의 환율</td>
                    <td className="py-2">가짜 숫자·플레이스홀더 금지</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-muted-foreground">
              가격·환율 API가 실패하면 숫자를 지어 넣지 않습니다. 그때는
              &ldquo;정확한 실시간 가격 및 프로모션은 공식 판매처에서
              확인하세요&rdquo;라는 중립 문구로 바꿉니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              편집 원칙
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">실물 테스트가 아님:</strong>{" "}
                리포트는 제조사 공개 스펙과 오픈 리뷰의 교차 분석이며, 직접 실물
                기기를 테스트한 리뷰가 아닙니다. 이 고지는 모든 게시물 상단에
                고정됩니다.
              </li>
              <li>
                <strong className="text-foreground">독립적 분석:</strong>{" "}
                추천은 공개 데이터와 편집부 판단에만 근거합니다. 제휴 링크가
                있을 수 있으나 순위나 결론을 구매하지 않습니다.
              </li>
              <li>
                <strong className="text-foreground">이미지 정직성:</strong>{" "}
                스톡 사진은 &ldquo;연출된 카테고리 예시 이미지 (실제 제품 실물
                사진이 아님)&rdquo;으로 캡션합니다. 제조사 프레스킷만 해당 제품
                공식 이미지로 표기합니다.
              </li>
              <li>
                <strong className="text-foreground">구성 다양성:</strong>{" "}
                글 유형(심층 분석, 비교, 개념 가이드, 체크리스트)마다 소제목
                순서를 바꿔, 사이트 안 글들이 같은 문장 구조와 표 형식으로 겹치지
                않게 합니다.
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
              <li>구매 가이드: 예산·공간·총소유비용 비교</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              문의하기
            </h2>
            <p className="text-muted-foreground">
              정정 요청, 제품 제보, 편집 관련 질문은{" "}
              <Link
                href={contactHref}
                className="font-medium text-accent hover:underline"
              >
                문의 양식
              </Link>
              으로 남겨 주세요. 양식에 회신 받을 이메일을 적으면 편집팀이 그
              주소로 답합니다.
            </p>
          </div>
        </section>
        <PublicationTagline locale={locale} className="mt-12" />
      </article>
    );
  }

  return (
    <article className={ARTICLE_SHELL}>
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        About AI Pick &amp; Report
      </h1>
      <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
        AI Pick &amp; Report is a data-driven publication that helps readers
        separate marketing copy from public specs when buying consumer
        electronics and appliances. We are not an in-house hardware lab. Our
        reports cross-check manufacturer-published specifications and open
        user-review data.
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Purpose
          </h2>
          <p className="text-muted-foreground">
            We exist so a reader can compare current retail models inside real
            constraints — budget, room, noise, and three-year ownership cost —
            rather than to push a particular storefront. Section order varies by
            article type so the site does not repeat one template spine.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Data-analysis criteria
          </h2>
          <p className="mb-3 text-muted-foreground">
            The formulaic in-article “Analysis methodology” block now lives here.
            Every report uses only the sources below.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-muted-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-semibold text-foreground">Item</th>
                  <th className="py-2 pr-3 font-semibold text-foreground">Source</th>
                  <th className="py-2 font-semibold text-foreground">Use</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3">Retail price</td>
                  <td className="py-2 pr-3">OEM sites and major storefronts</td>
                  <td className="py-2">Reference only — confirm live price at checkout</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3">Product specs</td>
                  <td className="py-2 pr-3">Manufacturer spec sheets</td>
                  <td className="py-2">Quantitative cross-check</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3">User feedback</td>
                  <td className="py-2 pr-3">Open public reviews</td>
                  <td className="py-2">Quality, noise, durability signals</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">What we do not use</td>
                  <td className="py-2 pr-3">In-house lab measurements, private seller APIs, invented FX rates</td>
                  <td className="py-2">No fake numbers or unresolved placeholders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Editorial principles
          </h2>
          <ul className="list-disc space-y-3 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Not a hands-on lab review:</strong>{" "}
              reports are spec + open-review cross-checks. That notice is fixed
              at the top of every post.
            </li>
            <li>
              <strong className="text-foreground">Independent analysis:</strong>{" "}
              recommendations rest on public data and editorial judgment.
              Affiliate links may fund the site; they do not buy rankings.
            </li>
            <li>
              <strong className="text-foreground">Honest images:</strong> stock
              photos are captioned as staged category examples, not product
              photography. Manufacturer press-kit assets keep brand credit.
            </li>
            <li>
              <strong className="text-foreground">Varied structure:</strong>{" "}
              deep-dives, comparisons, explainers, and checklists use different
              H2 orders so sentence rhythm and tables do not clone across posts.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            What we cover
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Mobile: smartphones, tablets, accessories</li>
            <li>Audio and wearables</li>
            <li>Smart home and appliances</li>
            <li>Buying guides by budget, room, and total cost of ownership</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Contact
          </h2>
          <p className="text-muted-foreground">
            Corrections, product tips, and editorial questions go through our{" "}
            <Link
              href={contactHref}
              className="font-medium text-accent hover:underline"
            >
              contact form
            </Link>
            . Include a reply email in the form and the editorial team will
            answer there.
          </p>
        </div>
      </section>
      <PublicationTagline locale={locale} className="mt-12" />
    </article>
  );
}
