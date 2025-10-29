import { NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = (u.searchParams.get('a') || '').trim();
  const b = (u.searchParams.get('b') || '').trim();
  if (!a || !b) return NextResponse.json({ error: 'Missing params a or b' }, { status: 400 });
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(a)},${encodeURIComponent(b)}&vs_currencies=usdt`, { cache: 'no-store', headers: { accept: 'application/json' }});
  if (!r.ok) return NextResponse.json({ error: 'CoinGecko error ' + r.status }, { status: 502 });
  const j:any = await r.json();
  const pa = j?.[a]?.usdt, pb = j?.[b]?.usdt;
  if (!(pa>0) || !(pb>0)) return NextResponse.json({ error: 'Missing USDT price for one token' }, { status: 404 });
  return NextResponse.json({ a, b, pa, pb, ratio: pa / pb, ts: Date.now() });
}