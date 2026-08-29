import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLE_SHELL } from "@/lib/layout";
import { locales, ogLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/paths";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const GOOGLE_ADS_SETTINGS = "https://adssettings.google.com";
const GOOGLE_PARTNER_DATA =
  "https://policies.google.com/technologies/partner-sites";
const ABOUTADS = "https://www.aboutads.info";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const dict = await getDictionary(locale);

  return {
    title: dict.privacy.title,
    description: dict.privacy.metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${siteConfig.url}${localizedPath(locale, "/privacy")}`,
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          `${siteConfig.url}${localizedPath(l, "/privacy")}`,
        ]),
      ),
    },
    openGraph: {
      title: dict.privacy.title,
      description: dict.privacy.metaDescription,
      url: `${siteConfig.url}${localizedPath(locale, "/privacy")}`,
      locale: ogLocales[locale],
    },
  };
}

function ExtLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="font-medium text-accent hover:underline"
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const contactHref = localizedPath(locale, "/contact");

  if (locale === "ko") {
    return (
      <article className={ARTICLE_SHELL}>
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          개인정보처리방침
        </h1>
        <p className="mt-3 font-sans text-sm text-muted-foreground">
          최종 업데이트: 2026년 8월 29일
        </p>

        <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              소개
            </h2>
            <p className="text-muted-foreground">
              AI Pick &amp; Report(이하 &ldquo;당사&rdquo;)는{" "}
              {siteConfig.url} 을 운영합니다. 본 방침은 웹사이트 방문 시 정보
              수집·이용·공유·보호 방법을 설명합니다. Google 제품 사용으로 인해
              이루어지는 데이터 처리도 여기에 포함됩니다.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              수집하는 정보
            </h2>
            <p className="text-muted-foreground">
              방문 시 IP 주소, 브라우저 유형, 운영체제, 유입 URL, 조회 페이지,
              접속 일시가 자동 수집될 수 있습니다. 문의 양식을 쓰면 이름, 회신
              이메일, 메시지 내용이 전달됩니다. 분석·광고를 위해 쿠키, 웹 비콘,
              기기 식별자가 사용될 수 있습니다.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              이용 목적
            </h2>
            <p className="text-muted-foreground">
              사이트 운영·유지, 사용성 개선, 트래픽 분석, 관련 콘텐츠 제공,
              Google 등 제3자 파트너를 통한 광고 게재에 활용합니다.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              광고·쿠키와 Google
            </h2>
            <p className="text-muted-foreground">
              당사는 Google을 포함한 제3자 광고 파트너와 협력할 수 있습니다.
              제3자는 광고 게재를 위해 이용자 브라우저에 쿠키를 저장·읽거나, 웹
              비콘·IP 주소 등 식별자로 정보를 수집할 수 있습니다. Google이
              파트너 사이트에서 데이터를 사용하는 방식은{" "}
              <ExtLink href={GOOGLE_PARTNER_DATA}>
                How Google uses information from sites or apps that use our
                services
              </ExtLink>
              에서 확인할 수 있습니다. 맞춤 광고는{" "}
              <ExtLink href={GOOGLE_ADS_SETTINGS}>Google 광고 설정</ExtLink>
              에서 해제할 수 있고, 업계 옵트아웃은{" "}
              <ExtLink href={ABOUTADS}>aboutads.info</ExtLink> 를 이용할 수
              있습니다.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              제3자 서비스
            </h2>
            <p className="text-muted-foreground">
              분석(예: Google Analytics)과 광고 서비스는 각 제공자의
              개인정보처리방침을 따릅니다. 당사는 문의 양식 전달을 위해 호스팅된
              폼 전달 서비스를 사용할 수 있습니다.
            </p>
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
              이용자 권리
            </h2>
            <p className="text-muted-foreground">
              관할 지역에 따라 열람·정정·삭제를 요청할 수 있습니다.{" "}
              <Link
                href={contactHref}
                className="font-medium text-accent hover:underline"
              >
                문의 양식
              </Link>
              으로 제출해 주세요.
            </p>
          </div>
        </section>
      </article>
    );
  }

  return (
    <article className={ARTICLE_SHELL}>
      <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 font-sans text-sm text-muted-foreground">
        Last updated: August 29, 2026
      </p>

      <section className="mt-10 space-y-8 font-sans text-[1.0625rem] leading-relaxed text-foreground/90">
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Introduction
          </h2>
          <p className="text-muted-foreground">
            AI Pick &amp; Report (&ldquo;we&rdquo;) operates {siteConfig.url}.
            This policy explains how we collect, use, share, and protect
            information when you visit the site, including data processing that
            results from our use of Google products.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Information we collect
          </h2>
          <p className="text-muted-foreground">
            We may automatically collect IP address, browser type, operating
            system, referring URLs, pages viewed, and timestamps. If you use the
            contact form we receive your name, reply email, and message. We may
            use cookies, web beacons, and device identifiers for analytics and
            advertising.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            How we use information
          </h2>
          <p className="text-muted-foreground">
            We use it to operate the site, improve usability, analyze traffic,
            deliver relevant content, and display ads through partners such as
            Google.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Advertising, cookies, and Google
          </h2>
          <p className="text-muted-foreground">
            We may work with third-party advertising partners, including Google.
            Those parties may place and read cookies on your browser, or use web
            beacons and IP addresses, as a result of ad serving. Google explains
            that use in{" "}
            <ExtLink href={GOOGLE_PARTNER_DATA}>
              How Google uses information from sites or apps that use our
              services
            </ExtLink>
            . Opt out of personalized ads in{" "}
            <ExtLink href={GOOGLE_ADS_SETTINGS}>Google Ads Settings</ExtLink>{" "}
            or via industry tools at{" "}
            <ExtLink href={ABOUTADS}>aboutads.info</ExtLink>.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Third-party services
          </h2>
          <p className="text-muted-foreground">
            Analytics (such as Google Analytics) and advertising vendors follow
            their own privacy policies. We may use a hosted form-delivery
            service to forward contact-form messages.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
            Your rights
          </h2>
          <p className="text-muted-foreground">
            Depending on your jurisdiction you may request access, correction, or
            deletion. Submit that request through the{" "}
            <Link
              href={contactHref}
              className="font-medium text-accent hover:underline"
            >
              contact form
            </Link>
            .
          </p>
        </div>
      </section>
    </article>
  );
}
