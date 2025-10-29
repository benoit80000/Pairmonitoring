import { NextResponse } from 'next/server';
export const runtime = 'edge';
type PriceMap = Record<string, { usdt?: number, usd?: number }>;
type CacheEntry = { ts: number; price: number };
const g: any = globalThis as any;
g.__CG__ = g.__CG__ || { prices: new Map<string, CacheEntry>() };
async function cgPrice(id: string): Promise<number> {
  const key = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usdt`;
  const headers: Record<string,string> = { accept:'application/json' };
  if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch(url, { cache: 'no-store', headers }); if (!res.ok) throw new Error(String(res.status));
  const j = (await res.json()) as PriceMap; const v = j?.[id]?.usdt ?? j?.[id]?.usd; const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('NaN'); return n;
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = (searchParams.get('a') || '').trim();
  const b = (searchParams.get('b') || '').trim();
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b (coingecko ids)' }, { status: 400 });
  const cache: Map<string, CacheEntry> = g.__CG__.prices; const now = Date.now(); const TTL = 15000;
  const ha = cache.get(a); const hb = cache.get(b);
  const needA = !ha || (now - ha.ts > TTL); const needB = !hb || (now - hb.ts > TTL);
  try {
    const [pa, pb] = await Promise.all([ needA ? cgPrice(a) : Promise.resolve(ha!.price), needB ? cgPrice(b) : Promise.resolve(hb!.price) ]);
    cache.set(a, { ts: now, price: pa }); cache.set(b, { ts: now, price: pb });
    const ratio = pa / pb; return NextResponse.json({ a, b, pa, pb, ratio, ts: now, source: 'coingecko' });
  } catch (e: any) { return NextResponse.json({ error: 'CoinGecko error ' + (e?.message || 'unknown') }, { status: 502 }); }
}