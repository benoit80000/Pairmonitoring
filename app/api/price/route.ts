import { NextResponse } from 'next/server';
export const runtime = 'edge';
type PriceMap = Record<string, { usdt?: number }>;
type CacheEntry = { ts: number; pa: number; pb: number; ratio: number };
const g: any = globalThis as any;
g.__CACHE__ = g.__CACHE__ || { map: new Map<string, CacheEntry>(), bucket: { tokens: 10, lastRefill: Date.now() } };
function takeToken(): boolean { const bucket = g.__CACHE__.bucket as { tokens: number; lastRefill: number };
  const now = Date.now(); const elapsed = now - bucket.lastRefill; const refill = Math.floor(elapsed/1000*1);
  if (refill>0){ bucket.tokens = Math.min(10, bucket.tokens + refill); bucket.lastRefill = now; }
  if (bucket.tokens>0){ bucket.tokens--; return true; } return false;
}
async function fetchCG(a: string, b: string): Promise<PriceMap> {
  const key = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(a)},${encodeURIComponent(b)}&vs_currencies=usdt`;
  const headers: Record<string,string> = { accept: 'application/json' }; if (key) headers['x-cg-pro-api-key'] = key;
  const res = await fetch(url, { cache: 'no-store', headers }); if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<PriceMap>;
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const a = (searchParams.get('a') || '').trim();
  const b = (searchParams.get('b') || '').trim();
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b' }, { status: 400 });
  const cache: Map<string, CacheEntry> = g.__CACHE__.map; const key = `${a}:${b}`; const now = Date.now(); const TTL = 30000;
  const hit = cache.get(key); if (hit && now - hit.ts < TTL) { return NextResponse.json({ a,b,pa:hit.pa,pb:hit.pb,ratio:hit.ratio,ts:hit.ts,cached:true }); }
  if (!takeToken()) { if (hit) return NextResponse.json({ a,b,pa:hit.pa,pb:hit.pb,ratio:hit.ratio,ts:hit.ts,cached:true }); return NextResponse.json({ error:'Rate limited locally' }, { status: 429 }); }
  let lastErr: any = null;
  for (let i=0;i<3;i++){ try{ const data = await fetchCG(a,b); const pa = Number(data?.[a]?.usdt); const pb = Number(data?.[b]?.usdt);
    if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa<=0 || pb<=0) throw new Error('No USDT price');
    const ratio = pa/pb; const entry = { ts: now, pa, pb, ratio }; cache.set(key, entry);
    return NextResponse.json({ a,b,pa,pb,ratio,ts: now, cached:false }); } catch(e:any){ lastErr=e; if (String(e.message)==='429'){ await new Promise(r=>setTimeout(r, 400*(i+1) + Math.random()*300)); continue; } break; } }
  if (hit) return NextResponse.json({ a,b,pa:hit.pa,pb:hit.pb,ratio:hit.ratio,ts:hit.ts,cached:true });
  return NextResponse.json({ error: 'CoinGecko error ' + (lastErr?.message || 'unknown') }, { status: 502 });
}