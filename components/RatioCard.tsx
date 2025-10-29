'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Sparkline from './Sparkline';
import tokens from '../lib/l2_tokens.json';

type T = { name:string; symbol:string; binance_symbol?:string };
type Row = { ts:number; a:string; b:string; pa:number; pb:number; ratio:number };

const ALL: T[] = (tokens as any).tokens_evm_l2;
function fmt(n:number){ return (n>=1? n.toLocaleString(undefined,{maximumFractionDigits:4}) : n.toLocaleString(undefined,{maximumFractionDigits:8})); }
function tsFmt(ts:number){ const d=new Date(ts); return d.toLocaleString(); }

export default function RatioCard(){
  const [manual,setManual]=useState(false);
  const [a,setA]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokA') || (ALL[0]?.binance_symbol || 'LINKUSDT') : 'LINKUSDT'));
  const [b,setB]=useState<string>(()=> (typeof localStorage!=='undefined'? localStorage.getItem('tokB') || (ALL[1]?.binance_symbol || 'PYTHUSDT') : 'PYTHUSDT'));
  const [intervalMs,setIntervalMs]=useState<number>(()=>{ const v= typeof localStorage!=='undefined'? Number(localStorage.getItem('intMs')||'4000'):4000; return Number.isFinite(v)&&v>=1500? v:4000; });
  const [hist,setHist]=useState<number[]>([]);
  const [ratio,setRatio]=useState<number|null>(null);
  const [pa,setPa]=useState<number|null>(null);
  const [pb,setPb]=useState<number|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [source,setSource]=useState<string>('binance');
  const [lastTs,setLastTs]=useState<number|null>(null);
  const [rows,setRows]=useState<Row[]>(()=>{
    if (typeof localStorage==='undefined') return [];
    try{ const raw = localStorage.getItem('hist5m'); return raw? JSON.parse(raw) as Row[] : []; }catch{ return []; }
  });
  const ctrl=useRef<AbortController|null>(null);
  const sampleTimer = useRef<any>(null);

  useEffect(()=>{ localStorage.setItem('tokA',a); },[a]);
  useEffect(()=>{ localStorage.setItem('tokB',b); },[b]);
  useEffect(()=>{ localStorage.setItem('intMs',String(intervalMs)); },[intervalMs]);

  // polling
  useEffect(()=>{
    let t:any;
    async function tick(){
      ctrl.current?.abort(); ctrl.current=new AbortController();
      try{
        const res=await fetch(`/api/price?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,{cache:'no-store',signal:ctrl.current.signal});
        const j=await res.json(); if(!res.ok) throw new Error(j.error||'Request failed');
        setPa(j.pa); setPb(j.pb); setRatio(j.ratio); setErr(null); setSource(j.source||'binance'); setLastTs(j.ts||Date.now());
        setHist(h=>{ const nx=[...h,j.ratio]; if(nx.length>300) nx.shift(); return nx; });
      }catch(e:any){ setErr(String(e?.message||'Erreur réseau')); }
    }
    tick();
    t=setInterval(tick, intervalMs);
    return ()=>{ clearInterval(t); ctrl.current?.abort(); };
  },[a,b,intervalMs]);

  // 5-min sampling (persist in localStorage)
  useEffect(()=>{
    function sampleNow(){
      if (ratio && pa && pb){
        const row: Row = { ts: Date.now(), a, b, pa, pb, ratio };
        setRows(prev=>{
          const next=[...prev, row].slice(-288); // ~24h if every 5min
          localStorage.setItem('hist5m', JSON.stringify(next));
          return next;
        });
      }
    }
    // immediate align to next 5-minute mark
    const now = Date.now();
    const msToNext = 300000 - (now % 300000);
    const first = setTimeout(()=>{
      sampleNow();
      sampleTimer.current = setInterval(sampleNow, 300000);
    }, msToNext);
    return ()=>{ clearTimeout(first); if(sampleTimer.current) clearInterval(sampleTimer.current); };
  }, [a,b,ratio,pa,pb]);

  const changePct=useMemo(()=>{ if(hist.length<2) return 0; const f=hist[0], l=hist[hist.length-1]; return ((l-f)/f)*100; },[hist]);

  function exportCSV(){
    const headers = ['timestamp','datetime','token_a','token_b','price_a','price_b','ratio'];
    const lines = rows.map(r=>[r.ts, new Date(r.ts).toISOString(), r.a, r.b, r.pa, r.pb, r.ratio]);
    const csv = [headers, ...lines].map(arr=>arr.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url; aTag.download = 'synpair_history_5min.csv'; aTag.click();
    URL.revokeObjectURL(url);
  }

  const options = ALL.map(t => ({ label: `${t.symbol} — ${t.name}`, value: (t.binance_symbol || (t.symbol.toUpperCase()+'USDT')) }));

  return (<div style={{display:'grid', gap:12}}>
    <div className="header">
      <div>
        <div className="small">Paire synthétique (source: {source})</div>
        <div style={{display:'flex',gap:10,alignItems:'baseline'}}>
          <div className="ratio">{ratio? fmt(ratio):'—'}</div>
          <div className="badge">{a} / {b}</div>
        </div>
        <div className="small">Dernière mise à jour : {lastTs? tsFmt(lastTs): '—'}</div>
      </div>
      <div style={{textAlign:'right'}}>
        <div className="small">Δ {changePct.toFixed(2)}% (session)</div>
        <div className="small">A: {pa? fmt(pa):'—'} | B: {pb? fmt(pb):'—'}</div>
        <div className="tools" style={{marginTop:8}}>
          <button className="button" onClick={exportCSV} title="Exporter l'historique 5 min en CSV">Exporter CSV</button>
        </div>
      </div>
    </div>

    <Sparkline data={hist}/>
    {err && <div className="alert">{err}</div>}
    <hr/>

    <div className="row">
      <div>
        <div className="small">Token A (symbole Binance)</div>
        {!manual ? (
          <select className="select" value={a} onChange={e=>setA(e.target.value)}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input className="input" value={a} onChange={e=>setA(e.target.value.trim().toUpperCase())} placeholder="ex: LINKUSDT"/>
        )}
      </div>
      <div>
        <div className="small">Token B (symbole Binance)</div>
        {!manual ? (
          <select className="select" value={b} onChange={e=>setB(e.target.value)}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input className="input" value={b} onChange={e=>setB(e.target.value.trim().toUpperCase())} placeholder="ex: PYTHUSDT"/>
        )}
      </div>
    </div>

    <div className="row">
      <div>
        <div className="small">Intervalle de rafraîchissement (ms)</div>
        <input className="input" type="number" min={1500} step={250} value={intervalMs} onChange={e=>setIntervalMs(Math.max(1500, Number(e.target.value)))} />
        <div className="small">Plus rapide possible sur Binance : ~1.5s (évite < 1.5s).</div>
      </div>
      <div>
        <div className="small">Mode de saisie</div>
        <button className="button" onClick={()=>setManual(m=>!m)}>{manual?'Sélection par liste':'Saisie libre'}</button>
        <div className="small">Actuel : {manual? 'Saisie libre' : 'Liste préchargée'}</div>
      </div>
    </div>

    {/* LEGENDES */}
    <div className="legend">
      <div className="item"><b>Ratio</b> Valeur A/B. Si le ratio monte, A surperforme B. Si le ratio baisse, B surperforme A.</div>
      <div className="item"><b>Badge A/B</b> Montre les <i>symboles Binance</i> utilisés (ex: LINKUSDT / PYTHUSDT).</div>
      <div className="item"><b>Graphique</b> Sparkline du ratio en temps réel (non lissé). Le pourcentage Δ compare le début de session au dernier point.</div>
      <div className="item"><b>Historique 5 min</b> Un échantillon (A, B, prix et ratio) est enregistré toutes les 5 minutes. Utilise <i>Exporter CSV</i> pour récupérer les données.</div>
    </div>

    {/* TABLE D'HISTORIQUE (dernières entrées) */}
    <div className="card" style={{marginTop:12}}>
      <div className="small" style={{marginBottom:8}}>Historique (échantillon 5 minutes) — {rows.length} points</div>
      <div style={{maxHeight:260, overflow:'auto'}}>
        <table className="table">
          <thead><tr><th>Date/Heure</th><th>Token A</th><th>Prix A</th><th>Token B</th><th>Prix B</th><th>Ratio</th></tr></thead>
          <tbody>
            {rows.slice(-20).reverse().map((r,idx)=>(
              <tr key={idx}>
                <td>{tsFmt(r.ts)}</td><td>{r.a}</td><td>{fmt(r.pa)}</td><td>{r.b}</td><td>{fmt(r.pb)}</td><td>{fmt(r.ratio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
}