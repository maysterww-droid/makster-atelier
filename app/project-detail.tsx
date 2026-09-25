"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { pageUi } from "./page-data";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { portfolioUi, type PortfolioProject } from "./portfolio-data";
import { useMaksterLanguage } from "./use-language";

export default function ProjectDetail({ project }: { project: PortfolioProject }) {
  const { lang, changeLanguage } = useMaksterLanguage();
  const text = project.copy[lang];
  const ui = portfolioUi[lang];
  const page = pageUi[lang];

  return (
    <main className="site project-detail-page">
      <SiteHeader lang={lang} onLanguage={changeLanguage} />
      <section className="project-detail-hero">
        <img src={project.hero ?? project.cover} alt={text.title} fetchPriority="high" />
        <span />
        <div className="section-shell project-detail-copy">
          <Link href="/realizace"><ArrowLeft size={17} />{ui.back}</Link>
          <p className="eyebrow">{text.category} · {ui[project.status]}</p>
          <h1>{text.title}</h1>
          <p>{text.details}</p>
        </div>
      </section>

      <section className="project-detail-gallery section-shell">
        <div className="project-detail-heading">
          <p className="eyebrow">{ui.gallery}</p>
          <h2>{ui.result}</h2>
          <span>{String(project.images.length).padStart(2, "0")}</span>
        </div>
        <div className="project-detail-grid">
          {project.images.map((image, index) => (
            <figure className={index === 0 ? "wide" : ""} key={image}>
              <img src={image} alt={`${text.title} — ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
              <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="project-detail-cta section-shell">
        <div><p className="eyebrow">MAKSTER ATELIER</p><h2>{text.title}</h2><p>{text.details}</p></div>
        <Link className="button button-gold" href="/kontakt"><span>{page.discuss}</span><ArrowRight size={18} /></Link>
      </section>
      <SiteFooter lang={lang} onLanguage={changeLanguage} />
    </main>
  );
}
