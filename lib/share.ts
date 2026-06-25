export type SharePlatform = {
  id: string;
  label: string;
  href: (url: string, title: string) => string;
};

export const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: "facebook",
    label: "Facebook",
    href: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: "x",
    label: "X",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "line",
    label: "LINE",
    href: (url) =>
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
];
