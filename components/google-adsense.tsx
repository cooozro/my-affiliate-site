const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? "ca-pub-9630508246667414";

/**
 * AdSense JS paints Auto ads even without in-article slots.
 * Keep the loader off until AdSense is approved
 * (`NEXT_PUBLIC_ADSENSE_ENABLED=true`).
 */
export function GoogleAdSenseHead() {
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
  if (!enabled || !ADSENSE_CLIENT_ID) return null;

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
