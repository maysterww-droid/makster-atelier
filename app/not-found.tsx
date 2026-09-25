import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span>404</span>
      <p className="eyebrow">Tady žádný nábytek nestojí</p>
      <h1>Stránka nebyla nalezena.</h1>
      <p>Možná byla přesunuta, nebo se do adresy vloudila malá výrobní odchylka.</p>
      <Link className="button button-gold" href="/"><ArrowLeft size={18} /> Zpět do Makster Atelier</Link>
    </main>
  );
}
