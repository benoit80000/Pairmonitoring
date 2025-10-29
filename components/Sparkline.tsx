'use client';import{useEffect,useRef}from'react';
export default function Sparkline({data,height=42}:{data:number[];height?:number}){
  const ref=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{const c=ref.current!;const x=c.getContext('2d')!;const w=c.clientWidth;const h=height;
    c.width=w*devicePixelRatio;c.height=h*devicePixelRatio;x.scale(devicePixelRatio,devicePixelRatio);
    x.clearRect(0,0,w,h);if(data.length<2)return;const min=Math.min(...data);const max=Math.max(...data);const range=max-min||1;
    x.beginPath();x.lineWidth=2;x.strokeStyle='#5b9cff';
    data.forEach((v,i)=>{const X=(i/(data.length-1))*(w-2)+1;const Y=h-((v-min)/range)*(h-2)-1; if(i===0)x.moveTo(X,Y); else x.lineTo(X,Y);});
    x.stroke();},[data,height]);return <canvas ref={ref} style={{width:'100%',height}}/>;}