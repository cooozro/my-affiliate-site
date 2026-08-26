import "server-only";

const FRANKFURTER_URL =
  "https://api.frankfurter.app/latest?from=USD&to=KRW";

export type MarketSnapshot = {
  usdKrwRate: number | null;
  fetchedAt: string;
  source: string;
  ok: boolean;
};

export async function getUsdKrwRate(): Promise<MarketSnapshot> {
  try {
    const response = await fetch(FRANKFURTER_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`FX API ${response.status}`);
    }

    const data = (await response.json()) as {
      date?: string;
      rates?: { KRW?: number };
    };

    const rate = data.rates?.KRW;
    if (!rate || !Number.isFinite(rate)) {
      throw new Error("FX API returned invalid KRW rate");
    }

    return {
      usdKrwRate: Math.round(rate),
      fetchedAt: data.date ?? new Date().toISOString().slice(0, 10),
      source: "Frankfurter (ECB reference rates)",
      ok: true,
    };
  } catch {
    return {
      usdKrwRate: null,
      fetchedAt: new Date().toISOString().slice(0, 10),
      source: "unavailable",
      ok: false,
    };
  }
}
