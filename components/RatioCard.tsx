'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sparkline from './Sparkline';
import tokens from '../lib/l2_tokens.json';
type T={ name:string; symbol:string; binance_symbol?:string };
const ALL: T[] = (tokens as any).tokens_evm_l2;
function fmt(n:number){ return (n>=1? n.toLocaleString(undefined,{maximumFractionDigits:4}) : n.toLocaleString(undefined,{maximumFractionDigits:8})); }
export default function RatioCard(){
  const [manual,setManual]=useState(false);
  const [a,setA]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokA') || (ALL[0]?.binance_symbol || 'LINKUSDT') : 'LINKUSDT'));
  const [b,setB]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokB') || (ALL[1]?.binance_symbol || 'PYTHUSDT') : 'PYTHUSDT'));
  const [intervalMs,setIntervalMs]=useState<number>(()=>{ const v= typeof localStorage!=='undefined'? Number(localStorage.getItem('intMs')||'4000'):4000; return Number.isFinite(v)&&v>=1500? v:4000; });
  const [hist,setHist]=useState<number[]>([]); const [ratio,setRatio]=useState<number|null>(null);
  const [pa,setPa]=useState<number|null>(null); const [pb,setPb]=useState<number|null>(null); const [err,setErr]=useState<string|null>(null);
  const ctrl=useRef<AbortController|null>(null);
  useEffect(()=>{ localStorage.setItem('tokA',a); },[a]); useEffect(()=>{ localStorage.setItem('tokB',b); },[b]); useEffect(()=>{ localStorage.setItem('intMs',String(intervalMs)); },[intervalMs]);
  useEffect(()=>{ let t:any; async function tick(){ ctrl.current?.abort(); ctrl.current=new AbortController();
    try{ const res=await fetch(`/api/price?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,{cache:'no-store',signal:ctrl.current.signal});
      const j=await res.json(); if(!res.ok) throw new Error(j.error||'Request failed');
      setPa(j.pa); setPb(j.pb); setRatio(j.ratio); setErr(null); setHist(h=>{ const nx=[...h,j.ratio]; if(nx.length>300) nx.shift(); return nx; }); }
    catch(e:any){ setErr(String(e?.message||'Erreur réseau')); } } tick(); t=setInterval(tick, intervalMs); return ()=>{ clearInterval(t); ctrl.current?.abort(); }; },[a,b,intervalMs]);
  const changePct=useMemo(()=>{ if(hist.length<2) return 0; const f=hist[0], l=hist[hist.length-1]; return ((l-f)/f)*100; },[hist]);
  const options=ALL.map(t=>({ label: `${t.symbol} — ${t.name}`, value: (t.binance_symbol || (t.symbol.toUpperCase()+'USDT')) }));
  return (<div className="grid" style={{gap:12}}>
    <div className="header"><div><div className="small">Paire synthétique (Binance)</div>
      <div style={{display:'flex',gap:10,alignItems:'baseline'}}><div className="ratio">{ratio? fmt(ratio):'—'}</div>
      <div className="badge">{a} / {b}</div></div></div>
      <div style={{textAlign:'right'}}><div className="small">Δ {changePct.toFixed(2)}% (session)</div>
      <div className="small">A: {pa? fmt(pa):'—'} | B: {pb? fmt(pb):'—'}</div></div></div>
    <Sparkline data={hist}/>{err&&<div className="alert">{err}</div>}<hr/>
    <div className="row"><div><div className="small">Token A (Binance symbol)</div>
      {!manual? (<select className="select" value={a} onChange={e=>setA(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>)
      : (<input className="input" value={a} onChange={e=>setA(e.target.value.trim().toUpperCase())} placeholder="ex: LINKUSDT"/>)}</div>
      <div><div className="small">Token B (Binance symbol)</div>
      {!manual? (<select className="select" value={b} onChange={e=>setB(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>)
      : (<input className="input" value={b} onChange={e=>setB(e.target.value.trim().toUpperCase())} placeholder="ex: PYTHUSDT"/>)}</div></div>
    <div className="row"><div><div className="small">Intervalle de rafraîchissement (ms)</div>
      <input className="input" type="number" min={1500} step={250} value={intervalMs} onChange={e=>setIntervalMs(Math.max(1500, Number(e.target.value)))} />
      <div className="small">Binance supporte un intervalle plus rapide (≥ 1.5s recommandé).</div></div>
      <div><div className="small">Mode de saisie</div><button className="button" onClick={()=>setManual(m=>!m)}>{manual?'Sélection par liste':'Saisie libre'}</button>
      <div className="small">Actuel : {manual? 'Saisie libre' : 'Liste préchargée'}</div></div></div></div>);
}