import type { Metadata } from "next";
import { fontClassNames } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = {
  title: `Admin | ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontClassNames} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
