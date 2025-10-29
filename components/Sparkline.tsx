'use client';
import { useEffect, useRef } from 'react';

export default function Sparkline({ data, height = 52 }: { data: number[]; height?: number }){
  const ref = useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{
    const c = ref.current!; const ctx = c.getContext('2d')!;
    const w = c.clientWidth; const h = height;
    c.width = w * devicePixelRatio; c.height = h * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0,0,w,h);
    if(data.length < 2) return;
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
    // grid lines
    ctx.globalAlpha = .25; ctx.lineWidth = 1; ctx.strokeStyle = '#334155';
    for(let i=1;i<4;i++){ const y = (h/4)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // line
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#6ae3ff';
    data.forEach((v,i)=>{
      const x = (i/(data.length-1))*(w-2)+1;
      const y = h - ((v-min)/range)*(h-2) - 1;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  },[data, height]);
  return <canvas ref={ref} style={{width:'100%', height}} />;
}
