import './globals.css';
export const metadata = { title: 'SynPair', description: 'Paires synthétiques (Binance & CoinGecko)' };
export default function RootLayout({children}:{children:React.ReactNode}){ return (<html lang="fr"><body>{children}</body></html>); }