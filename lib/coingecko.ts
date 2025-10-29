export async function getUsdtPrices(ids:string[]){
  const url=new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids',ids.join(','));url.searchParams.set('vs_currencies','usdt');
  const res=await fetch(url.toString());return res.json();
}