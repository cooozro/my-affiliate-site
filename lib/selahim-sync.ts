/**
 * aipick.shop → selahim 실시간 동기화 (수동 발행 후 webhook).
 * aipick/lib/selahim-sync.ts 에 복사해 publishPost 에서 호출.
 */
export async function notifySelahimAipickSync(input?: {
  slug?: string;
  refillBuffer?: boolean;
}): Promise<void> {
  const base = (() => {
    const direct = process.env.SELahim_SYNC_URL?.trim();
    if (direct) return direct;
    const admin = process.env.SELahim_ADMIN_URL?.trim()?.replace(/\/$/, "");
    if (admin) return `${admin}/api/cron/aipick-realtime-sync`;
    return "";
  })();
  const secret =
    process.env.SELahim_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (!base || !secret) return;

  try {
    await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": secret,
      },
      body: JSON.stringify({
        slug: input?.slug,
        refillBuffer: input?.refillBuffer ?? true,
        pullGit: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    /* non-blocking — selahim cron will catch up */
  }
}
