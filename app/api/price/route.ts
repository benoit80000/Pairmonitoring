import { NextResponse } from 'next/server';
export const runtime = 'edge';

type PriceMap = Record<string, { usdt?: number }>;
const g: any = globalThis as any;
g.__CACHE__ = g.__CACHE__ || { prices: new Map<string, { ts: number; pa: number; pb: number; ratio: number }>() };

async function fetchWithRetry(a: string, b: string, attempts = 3): Promise<PriceMap> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(a)},${encodeURIComponent(b)}&vs_currencies=usdt`;
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (res.ok) {
      return (await res.json()) as PriceMap;
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 400 * (i + 1);
      await new Promise(r => setTimeout(r, retryAfter));
      lastErr = new Error('429');
      continue;
    }
    lastErr = new Error('HTTP ' + res.status);
  }
  throw lastErr ?? new Error('fetch failed');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = (searchParams.get('a') || '').trim();
  const b = (searchParams.get('b') || '').trim();
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b' }, { status: 400 });

  const key = `${a}:${b}`;
  const cache: Map<string, { ts: number; pa: number; pb: number; ratio: number }> = g.__CACHE__.prices;

  try {
    const j = await fetchWithRetry(a, b, 3);
    const paRaw = (j && j[a] && j[a].usdt) ?? null;
    const pbRaw = (j && j[b] && j[b].usdt) ?? null;
    const pa = Number(paRaw);
    const pb = Number(pbRaw);
    if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa <= 0 || pb <= 0) {
      throw new Error('Missing USDT price');
    }
    const ratio = pa / pb;
    const ts = Date.now();
    const payload = { a, b, pa, pb, ratio, ts, cached: false as const };
    cache.set(key, { ts, pa, pb, ratio });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    const hit = cache.get(key);
    if (hit) {
      return NextResponse.json({ a, b, pa: hit.pa, pb: hit.pb, ratio: hit.pa / hit.pb, ts: hit.ts, cached: true as const });
    }
    const msg = String(err?.message || 'Unknown error');
    const status = msg.includes('429') ? 429 : 502;
    return NextResponse.json({ error: 'CoinGecko error ' + msg }, { status });
  }
}
