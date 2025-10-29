import { NextResponse } from 'next/server';
export async function GET(req) {
  const u = new URL(req.url); const a = u.searchParams.get('a'); const b = u.searchParams.get('b');
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${a},${b}&vs_currencies=usdt`);
  const j = await r.json(); return NextResponse.json({ a, b, ratio: j[a].usdt / j[b].usdt });
}