'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sparkline from './Sparkline';
import l2tokens from '../lib/l2_tokens.json';

type L2Token = { name:string; symbol:string; coingecko_id:string };
const tokens: L2Token[] = (l2tokens as any).tokens_evm_l2;
const sorted = [...tokens].sort((a,b)=>a.symbol.localeCompare(b.symbol));

function fmt(n:number){ return (n>=1? n.toLocaleString(undefined,{maximumFractionDigits:4}) : n.toLocaleString(undefined,{maximumFractionDigits:8})); }

export default function RatioCard(){
  const [manual, setManual] = useState(false);
  const [a,setA]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokA') || 'chainlink' : 'chainlink'));
  const [b,setB]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokB') || 'pyth-network' : 'pyth-network'));
  const [intervalMs,setIntervalMs]=useState<number>(()=>{ const v= typeof localStorage!=='undefined'? Number(localStorage.getItem('intMs')||'4000'):4000; return Number.isFinite(v)&&v>=2000? v:4000; });
  const [hist,setHist]=useState<number[]>([]);
  const [ratio,setRatio]=useState<number|null>(null);
  const [pa,setPa]=useState<number|null>(null);
  const [pb,setPb]=useState<number|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const ctrl=useRef<AbortController|null>(null);

  useEffect(()=>{ localStorage.setItem('tokA',a); },[a]);
  useEffect(()=>{ localStorage.setItem('tokB',b); },[b]);
  useEffect(()=>{ localStorage.setItem('intMs',String(intervalMs)); },[intervalMs]);

  useEffect(()=>{
    let t:any;
    async function tick(){
      ctrl.current?.abort(); ctrl.current = new AbortController();
      try{
        const res = await fetch(`/api/price?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`, { cache:'no-store', signal: ctrl.current.signal });
        const j = await res.json();
        if(!res.ok) throw new Error(j.error || 'Request failed');
        setPa(j.pa); setPb(j.pb); setRatio(j.ratio); setErr(null);
        setHist(h=>{ const nx=[...h, j.ratio]; if(nx.length>300) nx.shift(); return nx; });
        if (j.cached) setToast('Limite API atteinte : valeurs en cache utilisées (OK)');
        else setToast(null);
      }catch(e:any){
        const message = String(e?.message||'Erreur réseau');
        setErr(message);
        if (message.includes('429')){
          // auto backoff côté client
          setIntervalMs(ms => Math.min(ms*1.5, 15000));
          setToast('429 CoinGecko: intervalle augmenté automatiquement pour éviter la limite.');
        }
      }
    }
    tick();
    t = setInterval(tick, intervalMs);
    return ()=>{ clearInterval(t); ctrl.current?.abort(); };
  },[a,b,intervalMs]);

  const changePct = useMemo(()=>{ if(hist.length<2) return 0; const f=hist[0], l=hist[hist.length-1]; return ((l-f)/f)*100; },[hist]);

  return (
    <div className="grid" style={{gap:12}}>
      <div className="header">
        <div>
          <div className="small">Paire synthétique</div>
          <div style={{display:'flex', gap:10, alignItems:'baseline'}}>
            <div className="ratio">{ratio? fmt(ratio):'—'}</div>
            <div className="badge">{a.toUpperCase()} / {b.toUpperCase()}</div>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="small">Δ {changePct.toFixed(2)}% (session)</div>
          <div className="small">A: {pa? fmt(pa):'—'} USDT | B: {pb? fmt(pb):'—'} USDT</div>
        </div>
      </div>

      <Sparkline data={hist}/>
      {err && <div className="alert">{err}</div>}
      <hr/>

      <div className="row">
        <div>
          <div className="small">Token A (liste L2 EVM)</div>
          {!manual ? (
            <select className="select" value={a} onChange={e=>setA(e.target.value)}>
              {sorted.map(t=>(<option key={t.coingecko_id} value={t.coingecko_id}>{t.symbol} — {t.name}</option>))}
            </select>
          ) : (
            <input className="input" value={a} onChange={e=>setA(e.target.value.trim())} placeholder="coingecko_id (ex: chainlink)"/>
          )}
        </div>
        <div>
          <div className="small">Token B (liste L2 EVM)</div>
          {!manual ? (
            <select className="select" value={b} onChange={e=>setB(e.target.value)}>
              {sorted.map(t=>(<option key={t.coingecko_id} value={t.coingecko_id}>{t.symbol} — {t.name}</option>))}
            </select>
          ) : (
            <input className="input" value={b} onChange={e=>setB(e.target.value.trim())} placeholder="coingecko_id (ex: pyth-network)"/>
          )}
        </div>
      </div>

      <div className="row">
        <div>
          <div className="small">Intervalle de rafraîchissement (ms)</div>
          <input className="input" type="number" min={2000} step={500} value={intervalMs}
                 onChange={e=>setIntervalMs(Math.max(2000, Number(e.target.value)))} />
          <div className="small">Augmente si tu rencontres le 429 (limite CoinGecko).</div>
        </div>
        <div>
          <div className="small">Mode de saisie</div>
          <button className="button" onClick={()=>setManual(m=>!m)}>{manual ? 'Sélection par liste' : 'Saisie libre'}</button>
          <div className="small">Actuel : {manual? 'Saisie libre' : 'Liste L2 EVM'}</div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
