import RatioCard from "../components/RatioCard";
export default function Page(){
  return (
    <main className="container">
      <div className="hero">
        <h1 className="title">Web3 Synthetic Pair Monitor</h1>
        <p className="subtitle">Compare deux tokens (USDT) et suis leur ratio en direct. Design neon, glass & gradients.</p>
      </div>
      <div className="card"><RatioCard/></div>
      <div className="footer">Construit avec Next.js • Données publiques CoinGecko • Pas de trading, monitoring uniquement</div>
    </main>
  );
}