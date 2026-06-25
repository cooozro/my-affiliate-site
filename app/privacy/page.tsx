import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${siteConfig.name} 개인정보처리방침`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        개인정보처리방침
      </h1>
      <p className="mt-4 font-sans text-muted-foreground">
        애드센스 신청 전 필수 페이지입니다. 실제 운영 시 법적 검토 후 내용을
        보완해 주세요.
      </p>
      <section className="mt-10 space-y-6 font-sans text-sm leading-relaxed text-foreground/90">
        <div>
          <h2 className="font-semibold text-foreground">1. 수집하는 정보</h2>
          <p className="mt-2 text-muted-foreground">
            본 사이트는 방문 통계 분석 및 광고 게재를 위해 쿠키 및 유사 기술을
            사용할 수 있습니다.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-foreground">2. 정보 이용 목적</h2>
          <p className="mt-2 text-muted-foreground">
            서비스 개선, 콘텐츠 최적화, 맞춤형 광고 제공(Google AdSense 등)에
            활용됩니다.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-foreground">3. 문의</h2>
          <p className="mt-2 text-muted-foreground">
            개인정보 관련 문의는 사이트 운영자에게 연락해 주세요.
          </p>
        </div>
      </section>
    </article>
  );
}
