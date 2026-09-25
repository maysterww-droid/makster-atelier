"use client";

import { ArrowLeft, ArrowRight, Check, ChevronDown, Mail } from "lucide-react";
import Link from "next/link";
import { languages, type Lang } from "../content";
import { Brand } from "../site-chrome";
import { useMaksterLanguage } from "../use-language";

const plannerCopy: Record<Lang, {
  back:string; kicker:string; title:string; accent:string; lead:string; features:string[];
  launch:string; discuss:string; preparing:string; visual:string;
}> = {
  cs:{back:"Zpět na MAKSTER ATELIER",kicker:"PRVNÍ KROK K VAŠÍ KUCHYNI",title:"Navrhněte kuchyň.",accent:"Uvidíte ji. Znáte orientační cenu.",lead:"Prostor, moduly, materiály a 3D návrh v jednom kroku. Dream Planner propojujeme s výrobní knihovnou MAKSTER ATELIER.",features:["Moduly s reálnými výrobními rozměry","Materiály, pracovní desky a kování","3D pohled a orientační cena","Předání návrhu přímo do ateliéru"],launch:"Chci vědět o spuštění",discuss:"Probrat projekt už teď",preparing:"PŘIPRAVUJEME",visual:"Propojení plánování, kalkulace a výroby"},
  ru:{back:"Назад в MAKSTER ATELIER",kicker:"ПЕРВЫЙ ШАГ К ВАШЕЙ КУХНЕ",title:"Спроектируйте кухню.",accent:"Увидьте её. Узнайте ориентировочную цену.",lead:"Пространство, модули, материалы и 3D-проект в одном процессе. Мы соединяем Dream Planner с производственной библиотекой MAKSTER ATELIER.",features:["Модули с реальными производственными размерами","Материалы, столешницы и фурнитура","3D-вид и ориентировочная цена","Передача проекта прямо в ателье"],launch:"Сообщить о запуске",discuss:"Обсудить проект сейчас",preparing:"ГОТОВИМ К ЗАПУСКУ",visual:"Связь проектирования, расчёта и производства"},
  ua:{back:"Назад до MAKSTER ATELIER",kicker:"ПЕРШИЙ КРОК ДО ВАШОЇ КУХНІ",title:"Спроєктуйте кухню.",accent:"Побачте її. Дізнайтеся орієнтовну ціну.",lead:"Простір, модулі, матеріали та 3D-проєкт в одному процесі. Ми поєднуємо Dream Planner із виробничою бібліотекою MAKSTER ATELIER.",features:["Модулі з реальними виробничими розмірами","Матеріали, стільниці та фурнітура","3D-вигляд і орієнтовна ціна","Передача проєкту безпосередньо в ательє"],launch:"Повідомити про запуск",discuss:"Обговорити проєкт зараз",preparing:"ГОТУЄМО ДО ЗАПУСКУ",visual:"Зв’язок проєктування, розрахунку та виробництва"},
  en:{back:"Back to MAKSTER ATELIER",kicker:"THE FIRST STEP TO YOUR KITCHEN",title:"Design your kitchen.",accent:"See it. Know the guide price.",lead:"Space, modules, materials and a 3D design in one process. We are connecting Dream Planner to the MAKSTER ATELIER production library.",features:["Modules with real production dimensions","Materials, worktops and hardware","3D view and guide price","Send the design directly to the atelier"],launch:"Tell me when it launches",discuss:"Discuss a project now",preparing:"IN DEVELOPMENT",visual:"Planning, pricing and production in one flow"},
  pl:{back:"Wróć do MAKSTER ATELIER",kicker:"PIERWSZY KROK DO TWOJEJ KUCHNI",title:"Zaprojektuj kuchnię.",accent:"Zobacz ją. Poznaj orientacyjną cenę.",lead:"Przestrzeń, moduły, materiały i projekt 3D w jednym procesie. Łączymy Dream Planner z biblioteką produkcyjną MAKSTER ATELIER.",features:["Moduły o rzeczywistych wymiarach produkcyjnych","Materiały, blaty i okucia","Widok 3D i orientacyjna cena","Przekazanie projektu bezpośrednio do atelier"],launch:"Powiadom mnie o uruchomieniu",discuss:"Omów projekt teraz",preparing:"W PRZYGOTOWANIU",visual:"Projektowanie, wycena i produkcja w jednym procesie"},
  de:{back:"Zurück zu MAKSTER ATELIER",kicker:"DER ERSTE SCHRITT ZU IHRER KÜCHE",title:"Planen Sie Ihre Küche.",accent:"Sehen Sie sie. Kennen Sie den Richtpreis.",lead:"Raum, Module, Materialien und 3D-Entwurf in einem Prozess. Wir verbinden Dream Planner mit der Produktionsbibliothek von MAKSTER ATELIER.",features:["Module mit realen Fertigungsmaßen","Materialien, Arbeitsplatten und Beschläge","3D-Ansicht und Richtpreis","Entwurf direkt an das Atelier senden"],launch:"Zum Start benachrichtigen",discuss:"Projekt jetzt besprechen",preparing:"IN VORBEREITUNG",visual:"Planung, Kalkulation und Fertigung in einem Ablauf"},
};

export default function PlannerPage() {
  const { lang, changeLanguage } = useMaksterLanguage();
  const t=plannerCopy[lang];

  return (
    <main className="planner-page">
      <header className="planner-page-header">
        <Link href="/" className="back-link"><ArrowLeft size={17}/>{t.back}</Link>
        <span className="mini-brand"><Brand compact /></span>
        <label className="language-select planner-language" aria-label="Language">
          <select value={lang} onChange={(e)=>changeLanguage(e.target.value as Lang)}>{languages.map((item)=><option key={item.code} value={item.code}>{item.label}</option>)}</select><ChevronDown size={14}/>
        </label>
      </header>
      <section className="planner-page-grid">
        <div className="planner-page-copy">
          <div className="planner-brand-lockup"><Brand /></div>
          <p className="eyebrow" translate="no" lang="en">Dream Planner</p>
          <h1>{t.title}<br/><em>{t.accent}</em></h1>
          <p className="planner-page-lead">{t.lead}</p>
          <ul className="planner-feature-list">{t.features.map((feature)=><li key={feature}><Check size={18}/>{feature}</li>)}</ul>
          <div className="planner-page-actions">
            <a className="button button-gold" href="mailto:info@maksteratelier.com?subject=Dream%20Planner"><Mail size={18}/>{t.launch}</a>
            <a className="button button-outline" href="/kontakt">{t.discuss}<ArrowRight size={18}/></a>
          </div>
        </div>
        <div className="planner-page-visual">
          <img src="/media/projects/kitchen-beams-cover.webp" alt="MAKSTER ATELIER"/>
          <div><span>{t.preparing}</span><strong>{t.visual}</strong></div>
        </div>
      </section>
    </main>
  );
}
