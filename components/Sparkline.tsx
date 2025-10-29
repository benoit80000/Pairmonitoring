'use client';import{useEffect,useRef}from'react';
export default function Sparkline({data}){const r=useRef(null);useEffect(()=>{const c=r.current;if(!c)return;
const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.beginPath();data.forEach((v,i)=>x.lineTo(i*10,50-v*10));
x.stroke();},[data]);return <canvas ref={r} width={200} height={100}/>;}