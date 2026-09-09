const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "ca-pub-9630508246667414";

/**
 * AdSense site-ownership snippet. Google checks this during review
 * (코드 스니펫). Auto ads do not serve until the site is approved.
 */
export function GoogleAdSenseHead() {
  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
