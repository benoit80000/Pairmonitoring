import RatioCard from '../components/RatioCard';
export default function Page() {
  return (<main className='container'><h1 style={{fontSize:28,marginBottom:8}}>Moniteur de Paires Synthétiques</h1>
  <p style={{color:'var(--muted)',marginBottom:18}}>Compare deux tokens via USDT (paire pseudo-synthétique A/B). Sélectionne des tokens L2 EVM.</p>
  <div className='card'><RatioCard/></div></main>);
}