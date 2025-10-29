import { NextResponse } from 'next/server';
export const runtime = 'edge';
type Price = { symbol: string; price: string };
type CacheEntry = { ts: number; price: number };
const g: any = globalThis as any;
g.__BINANCE__ = g.__BINANCE__ || { prices: new Map<string, CacheEntry>(), symbols: new Map<string, boolean>() };
async function binancePrice(symbol: string): Promise<number> {
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error(String(res.status));
  const j = (await res.json()) as Price; const n = Number(j.price); if (!Number.isFinite(n)) throw new Error('NaN'); return n;
}
async function symbolExists(symbol: string): Promise<boolean> {
  const map: Map<string, boolean> = g.__BINANCE__.symbols; if (map.has(symbol)) return map.get(symbol)!;
  const url = `https://api.binance.com/api/v3/exchangeInfo?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { cache: 'force-cache' }); const ok = res.ok; map.set(symbol, ok); return ok;
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = (searchParams.get('a') || '').trim().toUpperCase();
  const b = (searchParams.get('b') || '').trim().toUpperCase();
  const norm = (s: string) => s.endsWith('USDT') ? s : (s + 'USDT');
  const sa = norm(a); const sb = norm(b);
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b (token symbols)' }, { status: 400 });
  const [ea, eb] = await Promise.all([symbolExists(sa), symbolExists(sb)]);
  if (!ea || !eb) return NextResponse.json({ error: 'Symbol not found on Binance', missing: { [sa]: !ea, [sb]: !eb } }, { status: 404 });
  const cache: Map<string, CacheEntry> = g.__BINANCE__.prices; const now = Date.now(); const TTL = 10000;
  const hitA = cache.get(sa); const hitB = cache.get(sb);
  const needA = !hitA || (now - hitA.ts > TTL); const needB = !hitB || (now - hitB.ts > TTL);
  try {
    const [pa, pb] = await Promise.all([ needA ? binancePrice(sa) : Promise.resolve(hitA!.price), needB ? binancePrice(sb) : Promise.resolve(hitB!.price) ]);
    cache.set(sa, { ts: now, price: pa }); cache.set(sb, { ts: now, price: pb });
    const ratio = pa / pb; return NextResponse.json({ a: sa, b: sb, pa, pb, ratio, ts: now, source: 'binance' });
  } catch (e: any) { return NextResponse.json({ error: 'Binance error ' + (e?.message || 'unknown') }, { status: 502 }); }
}