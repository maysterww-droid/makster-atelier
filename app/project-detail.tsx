"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Boxes, ChevronLeft, ChevronRight, Maximize2, Ruler, Settings2, X } from "lucide-react";
import { pageUi } from "./page-data";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { portfolioUi, type PortfolioProject } from "./portfolio-data";
import { useMaksterLanguage } from "./use-language";

const featureIcons = [Boxes, Settings2, Ruler];

export default function ProjectDetail({ project }: { project: PortfolioProject }) {
  const { lang, changeLanguage } = useMaksterLanguage();
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const text = project.copy[lang];
  const ui = portfolioUi[lang];
  const page = pageUi[lang];
  const images = Array.from(new Set([project.hero ?? project.cover, ...project.images]));
  const showPrevious = () => setActiveImage((current) => (current - 1 + images.length) % images.length);
  const showNext = () => setActiveImage((current) => (current + 1) % images.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setActiveImage((current) => (current - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setActiveImage((current) => (current + 1) % images.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [images.length, lightboxOpen]);

  return (
    <main className="site project-detail-page">
      <SiteHeader lang={lang} onLanguage={changeLanguage} />

      <section className="project-showcase section-shell">
        <nav className="project-breadcrumb" aria-label={ui.back}>
          <Link href="/">MAKSTER ATELIER</Link><span>/</span>
          <Link href="/realizace">{ui.back}</Link><span>/</span>
          <b>{text.title}</b>
        </nav>

        <div className="project-showcase-grid">
          <aside className="project-showcase-copy">
            <p className="eyebrow">{text.category}</p>
            <h1>{text.title}</h1>
            <p className="project-showcase-summary">{`${text.details}. ${ui.detailIntro}`}</p>
            <div className="project-showcase-features">
              {ui.features.map((feature, index) => {
                const FeatureIcon = featureIcons[index];
                return <div key={feature}><FeatureIcon size={29} strokeWidth={1.35} /><span>{feature}</span></div>;
              })}
            </div>
          </aside>

          <figure className={`project-showcase-media${project.heroLayout === "portrait" ? " portrait" : ""}`}>
            <button className="project-showcase-open" onClick={() => setLightboxOpen(true)} type="button" aria-label={`${ui.gallery}: ${ui.imageLabels[activeImage] ?? ui.result}`}>
              <Image
                src={images[activeImage]}
                alt={`${text.title} — ${ui.imageLabels[activeImage] ?? ui.result}`}
                fill
                priority={activeImage === 0}
                sizes="(max-width: 760px) 100vw, 69vw"
                style={{ objectPosition: activeImage === 0 ? project.heroPosition ?? project.coverPosition ?? "center" : "center" }}
              />
              <span className="project-showcase-shade" />
              <span className="project-expand-icon" aria-hidden="true"><Maximize2 size={19} /></span>
            </button>
            <div className="project-showcase-controls">
              <button type="button" onClick={showPrevious} aria-label={`${ui.gallery}: ${((activeImage - 1 + images.length) % images.length) + 1}`}><ChevronLeft size={23} /></button>
              <b>{activeImage + 1} / {images.length}</b>
              <button type="button" onClick={showNext} aria-label={`${ui.gallery}: ${((activeImage + 1) % images.length) + 1}`}><ChevronRight size={23} /></button>
            </div>
          </figure>
        </div>

        <div className="project-thumbnail-strip" aria-label={ui.gallery}>
          {images.map((image, index) => (
            <button
              aria-label={`${text.title} — ${ui.imageLabels[index] ?? `${ui.gallery} ${index + 1}`}`}
              aria-pressed={activeImage === index}
              className={activeImage === index ? "active" : ""}
              key={image}
              onClick={() => {
                setActiveImage(index);
                setLightboxOpen(true);
              }}
              type="button"
            >
              <span className="project-thumbnail-image"><Image src={image} alt="" fill sizes="210px" /></span>
              <b>{ui.imageLabels[index] ?? `${ui.gallery} ${index + 1}`}</b>
            </button>
          ))}
        </div>
      </section>

      {lightboxOpen ? (
        <div className="project-lightbox" role="dialog" aria-modal="true" aria-label={`${text.title} — ${ui.gallery}`} onClick={() => setLightboxOpen(false)}>
          <button ref={closeButtonRef} className="project-lightbox-close" onClick={() => setLightboxOpen(false)} type="button" aria-label={ui.close}><X size={26} /></button>
          <button className="project-lightbox-arrow previous" onClick={(event) => { event.stopPropagation(); showPrevious(); }} type="button" aria-label={`${ui.gallery}: ${((activeImage - 1 + images.length) % images.length) + 1}`}><ChevronLeft size={34} /></button>
          <div className="project-lightbox-image" onClick={(event) => event.stopPropagation()}>
            <Image src={images[activeImage]} alt={`${text.title} — ${ui.imageLabels[activeImage] ?? ui.result}`} fill priority sizes="100vw" />
          </div>
          <button className="project-lightbox-arrow next" onClick={(event) => { event.stopPropagation(); showNext(); }} type="button" aria-label={`${ui.gallery}: ${((activeImage + 1) % images.length) + 1}`}><ChevronRight size={34} /></button>
          <b className="project-lightbox-count">{activeImage + 1} / {images.length}</b>
        </div>
      ) : null}

      <section className="project-detail-cta section-shell">
        <div><p className="eyebrow">MAKSTER ATELIER</p><h2>{text.title}</h2><p>{text.details}</p></div>
        <Link className="button button-gold" href="/kontakt"><span>{page.discuss}</span><ArrowRight size={18} /></Link>
      </section>
      <Link className="project-back-link" href="/realizace"><ArrowLeft size={17} />{ui.back}</Link>
      <SiteFooter lang={lang} onLanguage={changeLanguage} />
    </main>
  );
}
