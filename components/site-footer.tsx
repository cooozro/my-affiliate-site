import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-sans text-sm text-muted-foreground">
          © {year} {siteConfig.name}. All rights reserved.
        </p>
        <nav
          className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
          aria-label="푸터 메뉴"
        >
          <Link href="/" className="transition hover:text-foreground">
            홈
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground">
            개인정보처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}
