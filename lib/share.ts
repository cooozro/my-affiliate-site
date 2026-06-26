export type LinkSharePlatform = {
  id: string;
  label: string;
  type: "link";
  href: (url: string, title: string) => string;
};

export type KakaoSharePlatform = {
  id: "kakao";
  label: string;
  type: "kakao";
};

export type SharePlatform = LinkSharePlatform | KakaoSharePlatform;

export function feedlySubscribeUrl(feedUrl: string): string {
  return `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}`;
}

export const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: "facebook",
    label: "Facebook",
    type: "link",
    href: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    type: "link",
    href: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    type: "link",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    type: "link",
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "kakao",
    label: "KakaoTalk",
    type: "kakao",
  },
];
