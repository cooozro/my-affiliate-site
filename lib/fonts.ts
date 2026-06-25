import { Geist_Mono } from "next/font/google";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

export const notoSans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const fontClassNames = `${notoSans.variable} ${notoSerif.variable} ${geistMono.variable}`;
