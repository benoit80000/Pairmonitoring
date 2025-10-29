import { NextResponse } from 'next/server';
export const runtime = 'edge';

type PriceRes = Record<string, { usdt?: number }>;
const g: any = globalThis as any;
g.__CACHE__ = g.__CACHE__ || { prices: new Map<string, { ts: number; pa: number; pb: number; ratio: number }>() };

async function fetchWithRetry(a: string, b: string, attempts = 3) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(a)},${encodeURIComponent(b)}&vs_currencies=usdt`;
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (res.ok) {
      const j = (await res.json()) as PriceRes;
      return j;
    }
    // 429: backoff + try cache
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || (400 * (i + 1));
      await new Promise(r => setTimeout(r, retryAfter));
      lastErr = new Error('429');
      continue;
    }
    lastErr = new Error('HTTP ' + res.status);
  }
  throw lastErr || new Error('fetch failed');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = (searchParams.get('a') || '').trim();
  const b = (searchParams.get('b') || '').trim();
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b' }, { status: 400 });

  const key = `${a}:${b}`;
  const cache = g.__CACHE__.prices as Map<string, { ts: number; pa: number; pb: number; ratio: number }>;

  try {
    const j = await fetchWithRetry(a, b, 3);
    const pa = j?.[a]?.usdt;
    const pb = j?.[b]?.usdt;
    if (!(pa > 0) || !(pb > 0)) throw new Error('Missing USDT price');
    const ratio = pa / pb;
    const payload = { a, b, pa, pb, ratio, ts: Date.now(), cached: false };
    cache.set(key, { ts: payload.ts, pa, pb, ratio });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    const hit = cache.get(key);
    if (hit) {
      // serve stale cache to survive 429 and spikes
      return NextResponse.json({ a, b, pa: hit.pa, pb: hit.pb, ratio: hit.pa / hit.pb, ts: hit.ts, cached: true });
    }
    const msg = err?.message || 'Unknown error';
    const status = msg.includes('429') ? 429 : 502;
    return NextResponse.json({ error: 'CoinGecko error ' + msg }, { status });
  }
}