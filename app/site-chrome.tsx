"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { copy, languages, type Lang } from "./content";
import { PlannerControl } from "./planner-control";

const navLinks = ["/realizace", "/sluzby", "/materialy", "/o-nas", "/kontakt"];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand brand-compact" : "brand"} translate="no" lang="en">
      <span className="brand-monogram" aria-hidden="true">
        <img src="/media/brand-logo.webp" alt="" />
      </span>
      <span className="brand-name">
        <strong>MAKSTER ATELIER</strong>
        <small>BESPOKE FURNITURE &amp; INTERIORS</small>
      </span>
    </span>
  );
}

export function SiteHeader({ lang, onLanguage, home = false, minimalNav = false }: { lang: Lang; onLanguage: (lang: Lang) => void; home?: boolean; minimalNav?: boolean }) {
  const t = copy[lang];
  const pathname = usePathname();

  return (
    <header className="site-header">
      <Link className="header-brand" href="/" aria-label="MAKSTER ATELIER"><Brand /></Link>
      <nav className="desktop-nav" aria-label={t.menu}>
        {t.nav.map((item, index) => (
          <Link className={pathname === navLinks[index] ? "active" : ""} key={item} href={navLinks[index]}>{item}</Link>
        ))}
        {!home && !minimalNav && <Link className={pathname === "/jak-pracujeme" ? "active" : ""} href="/jak-pracujeme">{t.processKicker}</Link>}
      </nav>
      <div className="header-actions">
        <div className="desktop-languages" aria-label="Language">
          {languages.map((item) => (
            <button className={lang === item.code ? "active" : ""} key={item.code} onClick={() => onLanguage(item.code)}>{item.label}</button>
          ))}
        </div>
        {!home && <PlannerControl className="header-planner"><span translate="no" lang="en">Dream Planner</span> <span>→</span></PlannerControl>}
        <label className="language-select mobile-language" aria-label="Language">
          <select value={lang} onChange={(event) => onLanguage(event.target.value as Lang)}>
            {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
        <details className="mobile-menu">
          <summary aria-label={t.menu}><Menu className="menu-open" size={27} /><X className="menu-close" size={27} /></summary>
          <nav aria-label={t.menu}>
            {t.nav.map((item, index) => <Link key={item} href={navLinks[index]}>{item}</Link>)}
            <Link href="/jak-pracujeme">{t.processKicker}</Link>
            <PlannerControl className="mobile-planner-control"><span translate="no" lang="en">Dream Planner</span></PlannerControl>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ lang, onLanguage }: { lang: Lang; onLanguage: (lang: Lang) => void }) {
  const t = copy[lang];
  return (
    <footer className="footer">
      <div className="section-shell footer-top">
        <Link href="/" aria-label="MAKSTER ATELIER"><Brand compact /></Link>
        <p>{t.footer}</p>
        <nav className="footer-mobile-nav" aria-label={t.menu}>
          {t.nav.map((item, index) => <Link key={item} href={navLinks[index]}><span>{item}</span><b>＋</b></Link>)}
        </nav>
        <div className="footer-languages">
          {languages.map((item) => (
            <button className={lang === item.code ? "active" : ""} key={item.code} onClick={() => onLanguage(item.code)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="section-shell footer-bottom">
        <span>© {new Date().getFullYear()} <b translate="no">MAKSTER ATELIER</b></span>
        <a href="mailto:info@maksteratelier.com">info@maksteratelier.com</a>
      </div>
    </footer>
  );
}
