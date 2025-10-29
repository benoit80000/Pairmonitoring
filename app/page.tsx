import Image from 'next/image';
import RatioCard from '../components/RatioCard';
export default function Page(){
  return (<main className="container">
    <div className="nav"><Image src="/logo.svg" alt="Logo" width={36} height={36} className="logo"/><div className="brand-name">SynPair</div></div>
    <div className="card"><RatioCard/></div>
    <div className="footer">Next.js • Binance public API • Monitoring uniquement • Historisation locale 5 min + export CSV</div>
  </main>);
}