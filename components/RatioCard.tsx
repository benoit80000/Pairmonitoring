'use client';import{useState,useEffect}from'react';import Sparkline from'./Sparkline';
import l2tokens from'@/lib/l2_tokens.json';export default function RatioCard(){const [a,setA]=useState('chainlink');
const [b,setB]=useState('chainlink');const [ratio,setRatio]=useState(null);const [hist,setHist]=useState([]);
useEffect(()=>{async function f(){const r=await fetch(`/api/price?a=${a}&b=${b}`);const j=await r.json();
setRatio(j.ratio);setHist(h=>[...h.slice(-50),j.ratio]);}f();const t=setInterval(f,3000);return()=>clearInterval(t);},[a,b]);
return(<div><select value={a}onChange={e=>setA(e.target.value)}>{l2tokens.tokens_evm_l2.map(t=><option key={t.coingecko_id}value={t.coingecko_id}>{t.symbol}</option>)}</select>
<select value={b}onChange={e=>setB(e.target.value)}>{l2tokens.tokens_evm_l2.map(t=><option key={t.coingecko_id}value={t.coingecko_id}>{t.symbol}</option>)}</select>
<p>Ratio:{ratio?.toFixed(4)}</p><Sparkline data={hist}/></div>);}