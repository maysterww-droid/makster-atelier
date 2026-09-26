"use client";

import { FormEvent, useState } from "react";
import { ArrowDown, ArrowRight, Factory, Mail, MapPinned, Phone, Upload, UsersRound } from "lucide-react";
import { copy } from "./content";
import { portfolioProjects, portfolioUi } from "./portfolio-data";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { PlannerControl } from "./planner-control";
import { quoteCopy } from "./quote-copy";
import { useMaksterLanguage } from "./use-language";
import { enquiryFeedback, sendEnquiry, type EnquiryState } from "./enquiry-client";

const proofIcons = [Factory, UsersRound, MapPinned];
const proofMarks = ["CZ", "1", "EU"];

const homeServiceImages = [
  "/media/projects/grey-classic-kitchen-cover.webp",
  "/media/projects/hallway-cover.webp",
  "/media/projects/apartment-living-cover.webp",
  "/media/projects/salon-partition-cover.webp",
];

const materialPartners = [
  { brand: "EGGER", tone: "egger" },
  { brand: "FENIX", tone: "fenix" },
  { brand: "CLEAF", tone: "cleaf" },
  { brand: "BLUM · HETTICH", tone: "hardware" },
];

const teamImages = [
  "/media/team-vyacheslav-stylized.webp",
  "/media/team-yuriy-stylized.webp",
  "/media/team-evgeniy-stylized.webp",
];

function PlannerLabel({ text }: { text: string }) {
  const [before, after = ""] = text.split("Dream Planner");
  return <>{before}<b translate="no" lang="en">Dream Planner</b>{after}</>;
}

export default function Home() {
  const { lang, changeLanguage } = useMaksterLanguage();
  const t = copy[lang];
  const quote = quoteCopy[lang];
  const portfolio = portfolioUi[lang];
  const featuredProjects = portfolioProjects.filter((project) => project.featured);
  const [enquiryState, setEnquiryState] = useState<EnquiryState>("idle");

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setEnquiryState("sending");
    try {
      await sendEnquiry(form, lang, "home");
      form.reset();
      setEnquiryState("sent");
    } catch {
      setEnquiryState("error");
    }
  };

  return (
    <main className="site" id="top">
      <section className="hero">
        <SiteHeader lang={lang} onLanguage={changeLanguage} home />

        <div className="hero-main">
          <picture className="hero-approved-bg">
            <source media="(max-width: 760px)" srcSet="/media/approved-home-mobile.webp" />
            <img src="/media/approved-home-desktop.webp" alt="MAKSTER ATELIER kitchen in white and oak" fetchPriority="high" />
          </picture>
          <span className="hero-photo-vignette" />
          <div className="hero-detail-rail"><span>{t.heroSide}</span></div>
          <img className="hero-monogram" src="/media/monogram.webp" alt="" />
          <span className="hero-gold-line" />
          <span className="hero-focus" />

          <div className="hero-copy">
            <p className="eyebrow">{t.heroKicker}</p>
            <h1><span>{t.heroTitleTop}</span><span>{t.heroTitleBottom}</span></h1>
            <p className="hero-lead">{t.heroBody}</p>
            <div className="hero-buttons">
              <PlannerControl className="button button-gold">
                <span><PlannerLabel text={t.plannerPrimary} /></span>
                <ArrowRight size={18} />
              </PlannerControl>
              <a className="button button-outline" href="/o-nas">{t.atelierCta}</a>
            </div>
            <div className="hero-phases">
              {t.heroPhases.map((phase, index) => <span key={phase}><i>{String(index + 1).padStart(2, "0")}</i>{phase}</span>)}
            </div>
          </div>
          <div className="hero-scroll">{t.scroll}<ArrowDown size={17} /></div>
        </div>

        <div className="hero-materials">
          <picture className="hero-approved-material-bg" aria-hidden="true">
            <source media="(max-width: 760px)" srcSet="/media/approved-home-mobile.webp" />
            <img src="/media/approved-home-desktop.webp" alt="" />
          </picture>
          <div className="hero-material-copy">
            <p className="eyebrow">{t.materialKicker}</p>
            <h2>{t.materialTitle}</h2>
          </div>
          <a href="/materialy">{t.materialContinue}<ArrowRight size={20} /></a>
        </div>
      </section>

      <section className="proof-row section-shell" aria-label="MAKSTER ATELIER">
        {t.stats.map(([strong, small], index) => {
          const ProofIcon = proofIcons[index];
          return (
            <article className="proof-card" data-mark={proofMarks[index]} key={strong}>
              <span className="proof-index">0{index + 1}</span>
              <span className="proof-symbol" aria-hidden="true"><ProofIcon size={30} strokeWidth={1.35} /></span>
              <div><strong>{strong}</strong><span>{small}</span></div>
            </article>
          );
        })}
      </section>

      <section className="projects section-shell" id="realizace">
        <div className="section-heading">
          <div><p className="eyebrow">{t.projectsKicker}</p><h2>{t.projectsTitle}</h2></div>
          <p>{t.projectsBody}</p>
        </div>
        <div className="project-grid portfolio-home-grid">
          {featuredProjects.map((project, index) => {
            const projectText = project.copy[lang];
            return (
            <a className={index === 0 ? "project-card project-card-wide" : "project-card"} key={project.slug} href={`/realizace/${project.slug}`}>
              <img src={project.cover} alt={projectText.title} loading={index > 1 ? "lazy" : "eager"} />
              <b className="home-project-status">{portfolio[project.status]}</b>
              <div className="project-overlay"><span>{projectText.category} · {projectText.details}</span><h3>{projectText.title}</h3><i>{String(index + 1).padStart(2, "0")}</i></div>
            </a>
            );
          })}
        </div>
        <a className="home-projects-link" href="/realizace">{portfolio.all}<ArrowRight size={18} /></a>
      </section>

      <section className="services" id="sluzby">
        <div className="section-shell services-grid">
          <div className="services-copy">
            <p className="eyebrow">{t.servicesKicker}</p><h2>{t.servicesTitle}</h2>
            <div className="image-frame"><img src="/media/kitchen-sink-detail.webp" alt="" /></div>
          </div>
          <div className="service-list service-visual-list">
            {t.serviceItems.map(([title, text], index) => <a key={title} href="/sluzby"><img src={homeServiceImages[index]} alt={title} /><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowRight size={21} /></a>)}
          </div>
        </div>
      </section>

      <section className="materials section-shell" id="materialy">
        <div className="materials-image"><img src="/media/realizace-hero-material.webp" alt="" /></div>
        <div className="materials-copy">
          <p className="eyebrow">{t.materialsKicker}</p><h2>{t.materialsTitle}</h2><p>{t.materialsBody}</p>
          <div className="material-marks" translate="no" lang="en">
            {materialPartners.map(({ brand, tone }, index) => (
              <span className={`material-mark material-mark-${tone}`} key={brand}>
                <i aria-hidden="true" />
                <small>0{index + 1}</small>
                <b>{brand}</b>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="planner-band">
        <img src="/media/kitchen-white-oak-wide.webp" alt="" />
        <div className="planner-band-shade" />
        <img className="planner-monogram" src="/media/monogram.webp" alt="" />
        <div className="planner-band-copy">
          <p className="eyebrow">{t.plannerKicker}</p><h2>{t.plannerTitle}</h2><p>{t.plannerBody}</p>
          <PlannerControl className="button button-gold"><span translate="no" lang="en">Dream Planner</span><ArrowRight size={18} /></PlannerControl>
        </div>
      </section>

      <section className="about section-shell" id="o-nas">
        <div className="section-heading">
          <div><p className="eyebrow">{t.aboutKicker}</p><h2>{t.aboutTitle}</h2></div>
          <p>{t.aboutBody}</p>
        </div>
        <div className="team-grid">
          {t.team.map(([name, role], index) => <article key={name}><div className="team-photo"><img src={teamImages[index]} alt={name} /></div><span>0{index + 1}</span><h3 translate="no">{name}</h3><p>{role}</p></article>)}
        </div>
      </section>

      <section className="process" id="proces">
        <div className="section-shell process-grid">
          <div className="process-intro"><p className="eyebrow">{t.processKicker}</p><h2>{t.processTitle}</h2><div className="image-frame"><img src="/media/kitchen-blue-installation.webp" alt="" /></div></div>
          <div className="home-process-grid">{t.process.map(([title, text], index) => <a href="/jak-pracujeme" key={title}><img src={["/media/kitchen-sink-detail.webp","/media/kitchen-white-oak-hero.webp","/media/kitchen-worktop-detail.webp","/media/kitchen-blue-installation.webp","/media/kitchen-white-oak-wide.webp"][index]} alt={title} /><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div></a>)}</div>
        </div>
      </section>

      <section className="b2b">
        <div className="b2b-image"><img src="/media/kitchen-tall-storage.webp" alt="" /></div>
        <div className="b2b-copy">
          <p className="eyebrow">{t.b2bKicker}</p><h2>{t.b2bTitle}</h2><p>{t.b2bBody}</p>
          <a className="button button-outline" href="mailto:info@maksteratelier.com?subject=Partnership%20project">{t.b2bCta}<ArrowRight size={18} /></a>
          <div className="quote-card">
            <span>{quote.kicker}</span>
            <h3 translate="no" lang="en">{quote.title}</h3>
            <p>{quote.body}</p>
            <a href="https://quote.maksteratelier.com" target="_blank" rel="noreferrer">{quote.cta}<ArrowRight size={17} /></a>
            <small>{quote.note}</small>
          </div>
        </div>
      </section>

      <section className="contact section-shell" id="kontakt">
        <div className="contact-copy">
          <p className="eyebrow">{t.contactKicker}</p><h2>{t.contactTitle}</h2><p>{t.contactBody}</p>
          <div className="contact-direct">
            <a href="tel:+420720472811"><Phone size={18} />+420 720 472 811</a>
            <a href="mailto:info@maksteratelier.com"><Mail size={18} />info@maksteratelier.com</a>
            <span>{t.location}</span>
          </div>
        </div>
        <form className="contact-form" onSubmit={submitEnquiry}>
          <input className="form-honeypot" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label>{t.form[0]}<input name="name" required autoComplete="name" /></label>
          <label>{t.form[1]}<input name="contact" required autoComplete="email" /></label>
          <label>{t.form[2]}<textarea name="project" required rows={5} /></label>
          <label className="upload-field"><span><Upload size={18} />{t.upload}</span><input name="files" type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" /><small>{enquiryFeedback[lang].files}</small></label>
          <button className="button button-gold" type="submit" disabled={enquiryState === "sending"}>{enquiryState === "sending" ? enquiryFeedback[lang].sending : t.form[3]}<ArrowRight size={18} /></button>
          {enquiryState !== "idle" && enquiryState !== "sending" && <p className={`form-status ${enquiryState}`} role="status" aria-live="polite">{enquiryFeedback[lang][enquiryState]}</p>}
        </form>
      </section>

      <SiteFooter lang={lang} onLanguage={changeLanguage} />
    </main>
  );
}
