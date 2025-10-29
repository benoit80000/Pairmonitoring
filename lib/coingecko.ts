export type PriceResponse = Record<string, { usdt?: number }>;
export async function getUsdtPrices(ids:string[]):Promise<PriceResponse>{
  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', 'usdt');
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' }, cache: 'no-store' });
  if(!res.ok) throw new Error('CoinGecko error ' + res.status);
  return res.json();
}