import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-sans text-lg font-semibold tracking-tight text-foreground transition hover:text-accent"
        >
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-4" aria-label="주요 메뉴">
          <Link
            href="/"
            className="hidden text-sm text-muted-foreground transition hover:text-foreground sm:inline"
          >
            홈
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
