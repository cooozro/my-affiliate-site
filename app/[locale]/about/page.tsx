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

function aboutJsonLd(locale: Locale) {
  const aboutUrl = `${siteConfig.url}${localizedPath(locale, "/about")}`;
  const contactUrl = `${siteConfig.url}${localizedPath(locale, "/contact")}`;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: locale === "ko" ? "AI Pick & Report 소개" : "About AI Pick & Report",
    url: aboutUrl,
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    mainEntity: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description:
        locale === "ko"
          ? "공개 스펙과 오픈 리뷰를 교차 분석하는 소비자 전자기기 구매 가이드 매체"
          : "A consumer-electronics buying-guide publication that cross-checks public specs and open reviews",
      publishingPrinciples: aboutUrl,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "editorial",
        url: contactUrl,
        availableLanguage: ["ko", "en"],
      },
    },
  };
}

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
  const privacyHref = localizedPath(locale, "/privacy");
  const homeHref = localizedPath(locale);

  if (locale === "ko") {
    return (
      <article className={ARTICLE_SHELL}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(aboutJsonLd("ko")),
          }}
        />
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          AI Pick &amp; Report 소개
        </h1>
        <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
          AI Pick &amp; Report는 소비자 전자기기·가전을 사기 전에, 마케팅 문구와
          공개 스펙을 가르는 구매 가이드를 발행하는 편집 매체입니다. 자체 실험실에서
          실물을 측정하는 리뷰 랩이 아닙니다. 제조사 스펙시트, 공시 가격, 오픈된
          사용자 후기를 같은 표에 올려 독자가 예산·공간·소음·3년 총소유비용 안에서
          결정할 수 있게 합니다.
        </p>

        <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              누가 운영하는가
            </h2>
            <p className="text-muted-foreground">
              발행 주체는 개인 펜네임이 아니라{" "}
              <strong className="text-foreground">
                AI Pick &amp; Report 편집부
              </strong>
              입니다. 글마다 가짜 경력의 저자 이름을 붙이지 않습니다. 책임 있는
              연락 창구는{" "}
              <Link
                href={contactHref}
                className="font-medium text-accent hover:underline"
              >
                문의 양식
              </Link>
              이며, 양식에 회신 이메일을 남기면 영업일 기준 2~3일 안에 편집부가
              그 주소로 답합니다. 개인정보 처리 방식은{" "}
              <Link
                href={privacyHref}
                className="font-medium text-accent hover:underline"
              >
                개인정보처리방침
              </Link>
              에 있습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              이 사이트가 다른 점
            </h2>
            <p className="mb-3 text-muted-foreground">
              같은 카테고리 글을 복붙하거나, 제조사 카피를 재배열한 랭킹 페이지가
              아닙니다. 가이드마다 아래를 지킵니다.
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">제약 조건부터:</strong> 예산,
                설치 공간, 소음, 3년 총소유비용으로 후보를 자릅니다.
              </li>
              <li>
                <strong className="text-foreground">패스 조건:</strong> 비교글에는
                이 모델이 맞지 않는 독자를 적시하는 skip/risk 표를 둡니다.
              </li>
              <li>
                <strong className="text-foreground">뼈대 반복 금지:</strong> 심층
                분석·비교·개념 가이드·체크리스트마다 소제목 순서를 바꿉니다.
              </li>
              <li>
                <strong className="text-foreground">방법론은 여기만:</strong>{" "}
                본문마다 같은 &ldquo;분석 방법론&rdquo; 문단을 붙이지 않습니다.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              데이터와 진실성
            </h2>
            <p className="mb-3 text-muted-foreground">
              숫자가 없으면 숫자를 만들지 않습니다. 모든 리포트는 아래 출처만
              사용합니다.
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
                    <td className="py-2">참고가. 실시간 시세는 판매처 확인</td>
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
              가격·환율 데이터를 가져오지 못하면 추정치를 넣지 않고, &ldquo;정확한
              실시간 가격 및 프로모션은 공식 판매처에서 확인하세요&rdquo;로
              바꿉니다. 글 상단 투명성 고지도 같은 사실을 반복합니다. 실물 테스트가
              아닙니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              편집 원칙과 제휴 고지
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">독립:</strong> 추천은 공개
                데이터와 편집부 판단에만 근거합니다. 제휴 링크가 있을 수 있으나
                순위나 결론을 구매하지 않습니다.
              </li>
              <li>
                <strong className="text-foreground">이미지:</strong> 스톡 사진은
                &ldquo;연출된 카테고리 예시 이미지 (실제 제품 실물 사진이
                아님)&rdquo;으로 캡션합니다. 제조사 프레스킷만 해당 제품 공식
                이미지로 표기합니다.
              </li>
              <li>
                <strong className="text-foreground">정정:</strong> 스펙·가격·모델명
                오류는 문의 양식으로 제보해 주세요. 확인되면 해당 글을 고치고
                업데이트 일자를 남깁니다.
              </li>
              <li>
                <strong className="text-foreground">면책:</strong> 가이드는 구매
                참고용이며 개별 설치·보증·세금을 대신하지 않습니다. 최종 확인은
                공식 판매처와 제조사입니다.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              글을 어떻게 쓰면 좋은가
            </h2>
            <p className="text-muted-foreground">
              비교표만 훑고 나가지 말고, 먼저 skip/risk 표로 본인 조건과 맞는지
              보시기 바랍니다. 글 하단 관련 가이드와 공유 버튼으로 같은 카테고리의
              다음 글을 이어서 읽을 수 있습니다. 댓글 창은 두지 않습니다. 오류
              지적·제품 제보·반대 의견은{" "}
              <Link
                href={contactHref}
                className="font-medium text-accent hover:underline"
              >
                문의
              </Link>
              로 받으며, 채택된 정정은 본문에 반영됩니다.{" "}
              <Link
                href={homeHref}
                className="font-medium text-accent hover:underline"
              >
                최신 가이드
              </Link>
              에서 최근 발행 글을 볼 수 있습니다.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              다루는 주제
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>모바일: 스마트폰, 태블릿, 액세서리</li>
              <li>오디오 &amp; 웨어러블</li>
              <li>스마트홈 &amp; 가전</li>
              <li>구매 가이드: 예산·공간·총소유비용 비교</li>
            </ul>
          </div>
        </section>
        <PublicationTagline locale={locale} className="mt-12" />
      </article>
    );
  }

  return (
    <article className={ARTICLE_SHELL}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aboutJsonLd("en")),
        }}
      />
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        About AI Pick &amp; Report
      </h1>
      <p className="mt-4 font-sans text-lg leading-relaxed text-muted-foreground">
        AI Pick &amp; Report publishes buying guides that separate marketing
        copy from public specifications before you purchase consumer electronics
        or appliances. We are not an in-house hardware lab. We put manufacturer
        spec sheets, listed retail prices, and open user reviews on the same
        table so a reader can decide inside real limits: budget, room, noise,
        and three-year ownership cost.
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Who runs this site
          </h2>
          <p className="text-muted-foreground">
            The publisher is the{" "}
            <strong className="text-foreground">
              AI Pick &amp; Report editorial desk
            </strong>
            , not a fabricated byline. We do not invent personal credentials. The
            accountable channel is our{" "}
            <Link
              href={contactHref}
              className="font-medium text-accent hover:underline"
            >
              contact form
            </Link>
            . Include a reply email; the desk answers there within two to three
            business days. How we handle data is in the{" "}
            <Link
              href={privacyHref}
              className="font-medium text-accent hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            What makes a report original here
          </h2>
          <p className="mb-3 text-muted-foreground">
            These pages are not reshuffled manufacturer copy or cloned ranking
            templates. Each guide is held to the following.
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Constraints first:</strong>{" "}
              budget, install space, noise, and three-year cost cut the shortlist.
            </li>
            <li>
              <strong className="text-foreground">Skip conditions:</strong>{" "}
              comparison pieces name who should not buy the shortlisted models.
            </li>
            <li>
              <strong className="text-foreground">No cloned spine:</strong>{" "}
              deep-dives, head-to-heads, explainers, and checklists rotate H2
              order.
            </li>
            <li>
              <strong className="text-foreground">Methodology lives here:</strong>{" "}
              we do not paste the same “analysis methodology” stump into every
              article.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Data and honesty
          </h2>
          <p className="mb-3 text-muted-foreground">
            If we cannot verify a number, we do not invent one. Every report uses
            only the sources below.
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
                  <td className="py-2">Reference only — confirm at checkout</td>
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
          <p className="mt-3 text-muted-foreground">
            When a price or FX feed fails, we switch to “confirm the live price
            at the official retailer” instead of guessing. The transparency notice
            at the top of each article repeats the same fact: this is not a
            hands-on lab test of a physical unit.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Editorial rules and affiliate disclosure
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Independence:</strong>{" "}
              recommendations rest on public data and editorial judgment.
              Affiliate links may fund the site; they do not buy rankings.
            </li>
            <li>
              <strong className="text-foreground">Images:</strong> stock photos
              are captioned as staged category examples, not product photography.
              Manufacturer press-kit assets keep brand credit.
            </li>
            <li>
              <strong className="text-foreground">Corrections:</strong> send spec,
              price, or model-name errors through the contact form. We update the
              article and stamp the revised date when a fix is confirmed.
            </li>
            <li>
              <strong className="text-foreground">Disclaimer:</strong> guides are
              buying references, not a substitute for install, warranty, or tax
              advice. Confirm details with the retailer and manufacturer.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            How to use a guide
          </h2>
          <p className="text-muted-foreground">
            Read the skip/risk table before the shortlist so you do not spend time
            on a model that cannot fit your room or budget. Related guides and
            share controls sit at the bottom of each article. We do not run a
            public comment thread. Corrections, product tips, and disagreement go
            through{" "}
            <Link
              href={contactHref}
              className="font-medium text-accent hover:underline"
            >
              contact
            </Link>
            ; accepted fixes land in the article body.{" "}
            <Link
              href={homeHref}
              className="font-medium text-accent hover:underline"
            >
              Latest guides
            </Link>{" "}
            lists what we have published recently.
          </p>
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
      </section>
      <PublicationTagline locale={locale} className="mt-12" />
    </article>
  );
}
