'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sparkline from './Sparkline';
import tokens from '../lib/tokens.json';
import { computeIndicators, Indicators } from './Indicators';
import DecisionBadge from './DecisionBadge';
import Kpi from './Kpi';

type T = { name:string; symbol:string; binance_symbol?:string; coingecko_id?:string };
type Row = { ts:number; a:string; b:string; pa:number; pb:number; ratio:number; ema20?:number; ema60?:number; rsi14?:number; vol30?:number; z30?:number; signal?:string };

const ALL: T[] = (tokens as any).tokens_evm_l2;
function fmt(n:number){ return (n>=1? n.toLocaleString(undefined,{maximumFractionDigits:4}) : n.toLocaleString(undefined,{maximumFractionDigits:8})); }
function tsFmt(ts:number){ const d=new Date(ts); return d.toLocaleString(); }

export default function RatioCard({ source = 'binance' as 'binance'|'coingecko' }){
  const [manual,setManual]=useState(false);
  const defaultA = source==='binance' ? (ALL.find(t=>t.binance_symbol)?.binance_symbol || 'LINKUSDT') : (ALL.find(t=>t.coingecko_id)?.coingecko_id || 'chainlink');
  const defaultB = source==='binance' ? (ALL.find(t=>t.binance_symbol && t.binance_symbol!=='LINKUSDT')?.binance_symbol || 'PYTHUSDT') : (ALL.find(t=>t.coingecko_id && t.coingecko_id!=='chainlink')?.coingecko_id || 'pyth-network');

  const [a,setA]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem(source+'_tokA') || defaultA : defaultA));
  const [b,setB]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem(source+'_tokB') || defaultB : defaultB));
  const [intervalMs,setIntervalMs]=useState<number>(()=>{ const v= typeof localStorage!=='undefined'? Number(localStorage.getItem(source+'_intMs')||'4000'):4000; return Number.isFinite(v)&&v>=1500? v:4000; });
  const [hist,setHist]=useState<number[]>([]);
  const [ratio,setRatio]=useState<number|null>(null);
  const [pa,setPa]=useState<number|null>(null);
  const [pb,setPb]=useState<number|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [lastTs,setLastTs]=useState<number|null>(null);
  const [ind, setInd] = useState<Indicators>({});
  const [rows,setRows]=useState<Row[]>(()=>{
    if (typeof localStorage==='undefined') return [];
    try{ const raw = localStorage.getItem(source+'_hist5m'); return raw? JSON.parse(raw) as Row[] : []; }catch{ return []; }
  });
  const ctrl=useRef<AbortController|null>(null);
  const sampleTimer = useRef<any>(null);

  useEffect(()=>{ localStorage.setItem(source+'_tokA',a); },[a,source]);
  useEffect(()=>{ localStorage.setItem(source+'_tokB',b); },[b,source]);
  useEffect(()=>{ localStorage.setItem(source+'_intMs',String(intervalMs)); },[intervalMs,source]);

  useEffect(()=>{ let t:any;
    async function tick(){
      ctrl.current?.abort(); ctrl.current=new AbortController();
      try{
        const res=await fetch(`/api/${source}/price?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,{cache:'no-store',signal:ctrl.current.signal});
        const j=await res.json(); if(!res.ok) throw new Error(j.error||'Request failed');
        setPa(j.pa); setPb(j.pb); setRatio(j.ratio); setErr(null); setLastTs(j.ts||Date.now());
        setHist(h=>{ const nx=[...h,j.ratio]; if(nx.length>720) nx.shift(); return nx; });
      }catch(e:any){ setErr(String(e?.message||'Erreur réseau')); }
    }
    tick(); t=setInterval(tick, intervalMs);
    return ()=>{ clearInterval(t); ctrl.current?.abort(); };
  },[a,b,intervalMs,source]);

  useEffect(()=>{ if (hist.length >= 2) setInd(computeIndicators(hist)); }, [hist]);

  useEffect(()=>{ function sampleNow(){
      if (ratio && pa && pb){
        const row: Row = { ts: Date.now(), a, b, pa, pb, ratio, ...ind, signal: ind.signal };
        setRows(prev=>{
          const next=[...prev, row].slice(-288);
          localStorage.setItem(source+'_hist5m', JSON.stringify(next));
          return next;
        });
      }
    }
    const now = Date.now(); const msToNext = 300000 - (now % 300000);
    const first = setTimeout(()=>{ sampleNow(); sampleTimer.current = setInterval(sampleNow, 300000); }, msToNext);
    return ()=>{ clearTimeout(first); if(sampleTimer.current) clearInterval(sampleTimer.current); };
  }, [a,b,ratio,pa,pb,ind,source]);

  const changePct=useMemo(()=>{ if(hist.length<2) return 0; const f=hist[0], l=hist[hist.length-1]; return ((l-f)/f)*100; },[hist]);

  function exportCSV(){
    const headers = ['timestamp','datetime','token_a','token_b','price_a','price_b','ratio','ema20','ema60','rsi14','vol30','z30','signal'];
    const lines = rows.map(r=>[r.ts, new Date(r.ts).toISOString(), r.a, r.b, r.pa, r.pb, r.ratio, r.ema20 ?? '', r.ema60 ?? '', r.rsi14 ?? '', r.vol30 ?? '', r.z30 ?? '', r.signal ?? '']);
    const csv = [headers, ...lines].map(arr=>arr.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const aTag = document.createElement('a'); aTag.href = url; aTag.download = `synpair_${source}_5min_indicators.csv`; aTag.click(); URL.revokeObjectURL(url);
  }

  const options = ALL.map(t => ({
    label: `${t.symbol} — ${t.name}`,
    value: source==='binance' ? (t.binance_symbol || (t.symbol.toUpperCase()+'USDT')) : (t.coingecko_id || t.symbol.toLowerCase())
  }));

  return (<div style={{display:'grid', gap:12}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <div>
        <div className="small">Paire synthétique (source: {source})</div>
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:10,alignItems:'baseline'}}>
            <div className="ratio">{ratio? fmt(ratio):'—'}</div>
            <div className="badge">{a} / {b}</div>
          </div>
          <DecisionBadge signal={ind.signal}/>
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        <div className="small">Δ session : {changePct.toFixed(2)}%</div>
        <div className="small">A: {pa? fmt(pa):'—'} | B: {pb? fmt(pb):'—'}</div>
        <div className="small" style={{marginTop:8}}><button className="button" onClick={exportCSV}>Exporter CSV</button></div>
      </div>
    </div>
    <div style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))'}}>
      <Kpi label="EMA20 / EMA60" value={`${ind.ema20? fmt(ind.ema20):'—'} / ${ind.ema60? fmt(ind.ema60):'—'}`} hint="Tendance court vs moyen terme"/>
      <Kpi label="RSI(14)" value={ind.rsi14!==undefined ? ind.rsi14.toFixed(1) : '—'} hint=">70 surachat · <30 survente"/>
      <Kpi label="Volatilité 30" value={ind.vol30!==undefined ? fmt(ind.vol30) : '—'} hint="Écart-type des 30 derniers points"/>
      <Kpi label="Z-score 30" value={ind.z30!==undefined ? ind.z30.toFixed(2) : '—'} hint="Écart (σ) vs moyenne 30 pts"/>
    </div>
    <div className='card' style={{padding:12}}><Sparkline data={hist}/>{err && <div className='alert' style={{marginTop:8}}>{err}</div>}</div>
    <div className="row">
      <div><div className="small">Token A ({source==='binance'?'symbole Binance':'ID CoinGecko'})</div>
        {!manual ? (<select className="select" value={a} onChange={e=>setA(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>)
                 : (<input className="input" value={a} onChange={e=>setA(e.target.value.trim())} placeholder={source==='binance'?'ex: LINKUSDT':'ex: chainlink'}/>)}</div>
      <div><div className="small">Token B ({source==='binance'?'symbole Binance':'ID CoinGecko'})</div>
        {!manual ? (<select className="select" value={b} onChange={e=>setB(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>)
                 : (<input className="input" value={b} onChange={e=>setB(e.target.value.trim())} placeholder={source==='binance'?'ex: PYTHUSDT':'ex: pyth-network'}/>)}</div>
    </div>
    <div className="row">
      <div><div className="small">Intervalle (ms)</div><input className="input" type="number" min={1500} step={250} value={intervalMs} onChange={e=>setIntervalMs(Math.max(1500, Number(e.target.value)))} /></div>
      <div><div className="small">Mode de saisie</div><button className="button" onClick={()=>setManual(m=>!m)}>{manual?'Sélection par liste':'Saisie libre'}</button></div>
    </div>
    <div className="card" style={{padding:12}}>
      <div className="small" style={{marginBottom:8}}>Historique (5 min, derniers 20 points)</div>
      <div style={{maxHeight:260, overflow:'auto'}}>
        <table className="table"><thead><tr><th>Date/Heure</th><th>A</th><th>Prix A</th><th>B</th><th>Prix B</th><th>Ratio</th></tr></thead>
        <tbody>{rows.slice(-20).reverse().map((r,idx)=>(<tr key={idx}><td>{tsFmt(r.ts)}</td><td>{r.a}</td><td>{fmt(r.pa)}</td><td>{r.b}</td><td>{fmt(r.pb)}</td><td>{fmt(r.ratio)}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}
