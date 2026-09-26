"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, ClipboardPenLine, DraftingCompass, Hammer, Mail, MapPin,
  MessageCircle, Phone, Ruler, Truck, Upload,
} from "lucide-react";
import { copy, type Lang } from "./content";
import { exactEditorialCopy } from "./editorial-copy";
import { materialLibraryCopy } from "./material-library";
import { pageUi } from "./page-data";
import { portfolioProjects, portfolioUi, type ProjectStatus } from "./portfolio-data";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { PlannerControl } from "./planner-control";
import { useMaksterLanguage } from "./use-language";
import { enquiryFeedback, sendEnquiry, type EnquiryState } from "./enquiry-client";

export type EditorialKind = "services" | "process" | "materials" | "projects" | "about" | "contact";

const heroImages: Record<EditorialKind, string> = {
  services: "/media/projects/salon-interior-reception.webp",
  process: "/media/kitchen-blue-installation.webp",
  materials: "/media/projects/ivory-classic-vanity-wide.webp",
  projects: "/media/projects/salon-partition-cover.webp",
  about: "/media/kitchen-white-oak-hero.webp",
  contact: "/media/projects/salon-interior-reception.webp",
};

const serviceImages = [
  "/media/projects/grey-classic-kitchen-cover.webp", "/media/projects/hallway-cover.webp",
  "/media/projects/apartment-living-cover.webp", "/media/projects/salon-partition-cover.webp",
];

const processImages = [
  "/media/projects/apartment-living-cover.webp", "/media/kitchen-white-oak-wide.webp",
  "/media/kitchen-beams-angle.webp", "/media/kitchen-worktop-detail.webp",
  "/media/projects/classic-craft-side.webp", "/media/kitchen-blue-installation.webp",
];

const materialImages = [
  "/media/projects/grey-classic-display.webp", "/media/projects/ivory-classic-vanity-wide.webp",
  "/media/projects/hallway-detail.webp", "/media/projects/grey-classic-vitrine.webp",
];

const teamImages = [
  "/media/team-vyacheslav-stylized.webp", "/media/team-yuriy-stylized.webp", "/media/team-evgeniy-stylized.webp",
];

const stageIcons = [MessageCircle, DraftingCompass, Ruler, ClipboardPenLine, Hammer, Truck];
const serviceFeatureIcons = [DraftingCompass, Ruler, Hammer];

const materialArt: Record<Lang, { kicker: string; title: string }> = {
  ru: { kicker: "ПРЕМИАЛЬНЫЕ МАТЕРИАЛЫ · ПРОДУМАНО ДО ДЕТАЛЕЙ", title: "Материалы, которые выдерживают реальную жизнь." },
  ua: { kicker: "ПРЕМІАЛЬНІ МАТЕРІАЛИ · ПРОДУМАНО ДО ДЕТАЛЕЙ", title: "Матеріали, що витримують реальне життя." },
  cs: { kicker: "PRÉMIOVÉ MATERIÁLY · PROMYŠLENÉ DO DETAILU", title: "Materiály, které vydrží skutečný život." },
  en: { kicker: "PREMIUM MATERIALS · CONSIDERED IN DETAIL", title: "Materials made for real life." },
  pl: { kicker: "MATERIAŁY PREMIUM · PRZEMYŚLANE W DETALU", title: "Materiały stworzone do prawdziwego życia." },
  de: { kicker: "PREMIUM-MATERIALIEN · BIS INS DETAIL DURCHDACHT", title: "Materialien für das echte Leben." },
};

const materialHeroBody: Record<Lang, string> = {
  ru: "Внешний вид — это начало. Главное — стойкость, уход и точность исполнения.",
  ua: "Вигляд — це початок. Головне — стійкість, догляд і точність виконання.",
  cs: "Vzhled je začátek. Rozhoduje odolnost, údržba a přesné zpracování.",
  en: "Appearance is only the beginning. Durability, care and precise workmanship decide.",
  pl: "Wygląd to dopiero początek. Liczą się trwałość, pielęgnacja i precyzja wykonania.",
  de: "Die Optik ist erst der Anfang. Entscheidend sind Beständigkeit, Pflege und präzise Verarbeitung.",
};

const materialPlannerLabel: Record<Lang, string> = {
  ru: "Выбрать в Dream Planner", ua: "Обрати в Dream Planner", cs: "Vybrat v Dream Planner",
  en: "Choose in Dream Planner", pl: "Wybierz w Dream Planner", de: "Im Dream Planner auswählen",
};

const teamLabels: Record<Lang, string> = {
  ru: "Наша команда.", ua: "Наша команда.", cs: "Náš tým.", en: "Our team.", pl: "Nasz zespół.", de: "Unser Team.",
};

function PlannerLabel({ text }: { text: string }) {
  const [before, after = ""] = text.split("Dream Planner");
  return <>{before}<b translate="no" lang="en">Dream Planner</b>{after}</>;
}

function pageHeading(kind: EditorialKind, t: (typeof copy)[keyof typeof copy]) {
  if (kind === "services") return [t.servicesKicker, t.servicesTitle, t.heroBody];
  if (kind === "process") return [t.processKicker, t.processTitle, t.aboutBody];
  if (kind === "materials") return [t.materialsKicker, t.materialsTitle, t.materialsBody];
  if (kind === "projects") return [t.projectsKicker, t.projectsTitle, t.projectsBody];
  if (kind === "about") return [t.aboutKicker, t.aboutTitle, t.aboutBody];
  return [t.contactKicker, t.contactTitle, t.contactBody];
}

function ArtHero({
  kind, kicker, title, body, plannerLabel, discussLabel,
}: {
  kind: EditorialKind; kicker: string; title: string; body: string; plannerLabel: string; discussLabel: string;
}) {
  const sentences = title.split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = title.split(/\s+/);
  const titleParts = sentences.length > 1 ? sentences : [
    words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" "),
  ].filter(Boolean);

  return (
    <section className={`art-hero art-hero-${kind}`}>
      <div className="art-hero-photo">
        {kind === "about" ? (
          <>
            <div className="about-hero-team">
              {teamImages.slice(0, 2).map((image, index) => <img src={image} alt="" key={image} fetchPriority={index === 0 ? "high" : "auto"} />)}
            </div>
            <img className="about-mobile-photo" src={heroImages[kind]} alt="" fetchPriority="high" />
          </>
        ) : kind === "projects" ? (
          <picture>
            <source media="(max-width: 760px)" srcSet="/media/projects/salon-partition-cover.webp" />
            <img src="/media/projects/apartment-living-cover.webp" alt="" fetchPriority="high" />
          </picture>
        ) : <img src={heroImages[kind]} alt="" fetchPriority="high" />}
        <span className="art-hero-photo-shade" />
      </div>
      <div className="art-blueprint" aria-hidden="true"><span /><span /><span /><span /></div>
      <img className="art-monogram" src="/media/monogram.webp" alt="" />
      <div className="art-hero-copy">
        <p className="eyebrow">{kicker}</p>
        <h1>{titleParts.map((part, index) => <span className={kind === "projects" && index === 1 ? "gold" : undefined} key={`${part}-${index}`}>{part}</span>)}</h1>
        <p className="art-hero-lead">{body}</p>
        {(kind === "process" || kind === "materials" || kind === "contact") && (
          <div className="art-hero-actions">
            <PlannerControl className="button button-gold"><span><PlannerLabel text={plannerLabel} /></span><ArrowRight size={18} /></PlannerControl>
            {kind !== "contact" && <Link className="button button-outline" href="/kontakt">{discussLabel}</Link>}
          </div>
        )}
      </div>
      <div className="art-hero-detail"><span>MAKSTER</span><span>ATELIER</span><i /></div>
    </section>
  );
}

function GoldLink({ href, children, solid = false }: { href: string; children: ReactNode; solid?: boolean }) {
  return <Link className={solid ? "button button-gold exact-link" : "exact-link"} href={href}><span>{children}</span><ArrowRight size={18} /></Link>;
}

function ImageStatement({ kicker, title, body, image, cta, href = "/kontakt" }: {
  kicker: string; title: string; body: string; image: string; cta: string; href?: string;
}) {
  return (
    <section className="exact-statement">
      <img src={image} alt="" />
      <div className="exact-statement-shade" />
      <div className="exact-statement-copy">
        <p className="eyebrow">{kicker}</p><h2>{title}</h2><p>{body}</p>
        <GoldLink href={href}>{cta}</GoldLink>
      </div>
      <img className="exact-statement-mark" src="/media/monogram.webp" alt="" />
    </section>
  );
}

export default function EditorialPage({ kind }: { kind: EditorialKind }) {
  const { lang, changeLanguage } = useMaksterLanguage();
  const t = copy[lang];
  const ui = pageUi[lang];
  const x = exactEditorialCopy[lang];
  const materialLibrary = materialLibraryCopy[lang];
  const portfolio = portfolioUi[lang];
  const [projectFilter, setProjectFilter] = useState<"all" | ProjectStatus>("all");
  const [enquiryState, setEnquiryState] = useState<EnquiryState>("idle");
  const [defaultKicker, defaultTitle, defaultBody] = pageHeading(kind, t);
  const kicker = kind === "materials" ? materialArt[lang].kicker : defaultKicker;
  const title = kind === "materials" ? materialArt[lang].title : defaultTitle;
  const body = kind === "materials" ? materialHeroBody[lang] : defaultBody;
  const plannerLabel = kind === "materials" ? materialPlannerLabel[lang] : t.plannerPrimary;
  const projectCards = projectFilter === "all"
    ? portfolioProjects
    : portfolioProjects.filter((project) => project.status === projectFilter);

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setEnquiryState("sending");
    try {
      await sendEnquiry(form, lang, "contact-page");
      form.reset();
      setEnquiryState("sent");
    } catch {
      setEnquiryState("error");
    }
  };

  return (
    <main className={`site art-site exact-site art-site-${kind}`}>
      <SiteHeader lang={lang} onLanguage={changeLanguage} minimalNav={kind === "projects"} />

      {kind !== "contact" && <ArtHero kind={kind} kicker={kicker} title={title} body={body} plannerLabel={plannerLabel} discussLabel={ui.discuss} />}

      {kind === "services" && (
        <>
          <section className="services-art exact-section section-shell">
            <div className="exact-section-head"><h2>{x.servicesIntro}</h2><p>{x.servicesBody}</p></div>
            <div className="service-showcase exact-service-showcase">
              {t.serviceItems.map(([itemTitle, text], index) => (
                <article className={`service-art-card exact-service-card ${index === 0 ? "featured" : "compact"}`} key={itemTitle}>
                  <div className="service-art-image">
                    <img src={serviceImages[index]} alt={itemTitle} />
                    <span className="service-number">{String(index + 1).padStart(2, "0")}</span>
                    <small>{String(index + 1).padStart(2, "0")} / 04</small>
                    <b>{index === 0 ? t.heroKicker : t.serviceItems[index][0]}</b>
                  </div>
                  <div className="service-art-copy">
                    <span className="service-copy-number">{String(index + 1).padStart(2, "0")}</span>
                    <p>{index === 0 ? t.heroKicker : itemTitle}</p>
                    <h2>{itemTitle}</h2><span>{text}</span>
                    <ul>{x.serviceTags[index].map((tag, tagIndex) => {
                      const TagIcon = serviceFeatureIcons[tagIndex];
                      return <li key={tag}>{TagIcon && <TagIcon aria-hidden="true" />}<span>{tag}</span></li>;
                    })}</ul>
                    <GoldLink href="/kontakt">{x.learnMore}</GoldLink>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="exact-route section-shell">
            <h2>{x.routeTitle}</h2>
            <div>{ui.process.slice(0, 4).map(([stepTitle, text], index) => (
              <article key={stepTitle}><span>0{index + 1}</span><i /><h3>{stepTitle}</h3><p>{text}</p></article>
            ))}</div>
            <GoldLink href="/jak-pracujeme" solid>{x.routeCta}</GoldLink>
          </section>

          <div className="section-shell">
            <ImageStatement kicker={x.craftKicker} title={x.craftTitle} body={x.craftBody} image="/media/kitchen-worktop-detail.webp" cta={t.materialsTitle} href="/materialy" />
          </div>

          <section className="exact-final-cta section-shell">
            <p className="eyebrow">{x.contactKicker}</p><h2>{x.contactTitle}</h2>
            <GoldLink href="/kontakt" solid>{ui.discuss}</GoldLink>
            <a href="mailto:info@maksteratelier.com">info@maksteratelier.com</a>
          </section>
        </>
      )}

      {kind === "process" && (
        <>
          <section className="process-art exact-section">
            <div className="section-shell exact-section-head process-exact-head"><h2>{x.processIntro}</h2><p>{x.processBody}</p></div>
            <div className="section-shell process-line exact-process-line">
              {ui.process.map(([stepTitle, text], index) => {
                const Icon = stageIcons[index];
                return (
                  <article className="process-step exact-process-step" key={stepTitle}>
                    <div className="process-step-image"><img src={processImages[index]} alt={stepTitle} /><span>0{index + 1}</span></div>
                    <p className="eyebrow">{index === 0 ? t.contactKicker : index === 1 ? "Dream Planner" : t.heroPhases[index % t.heroPhases.length]}</p>
                    <h2>{stepTitle}</h2><p>{text}</p><Icon className="process-icon" size={25} />
                  </article>
                );
              })}
            </div>
            <div className="section-shell process-promise"><span /><strong>{x.processRule}</strong><span /></div>
          </section>
          <div className="section-shell"><ImageStatement kicker={x.craftKicker} title={x.realityTitle} body={x.realityBody} image="/media/kitchen-white-oak-peninsula.webp" cta={ui.discuss} /></div>
        </>
      )}

      {kind === "materials" && (
        <>
          <section className="materials-art exact-section section-shell">
            <div className="exact-section-head"><h2>{x.materialsIntro}</h2><p>{x.materialsBody}</p></div>
            <div className="material-panels exact-material-panels">
              {ui.materials.map(([materialTitle, text], index) => (
                <article className="material-panel exact-material-panel" key={materialTitle}>
                  <div className="material-panel-image"><img src={materialImages[index]} alt={materialTitle} /><span>0{index + 1}</span><small>0{index + 1} / 04</small></div>
                  <div className="material-panel-copy"><h2>{materialTitle}</h2><p>{text}</p><GoldLink href={`#material-${materialLibrary.categories[index].id}`}>{x.materialCtas[index]}</GoldLink></div>
                </article>
              ))}
            </div>
          </section>

          <section className="material-library section-shell" aria-labelledby="material-library-title">
            <div className="material-library-intro">
              <p className="eyebrow">MAKSTER MATERIAL LIBRARY</p>
              <h2 id="material-library-title">{materialLibrary.title}</h2>
              <p>{materialLibrary.intro}</p>
            </div>
            <div className="material-library-list">
              {materialLibrary.categories.map((category, index) => (
                <article className="material-library-card" id={`material-${category.id}`} key={category.id}>
                  <div className="material-library-image">
                    <img src={materialImages[index]} alt={category.title} />
                    <span>0{index + 1}</span>
                  </div>
                  <div className="material-library-copy">
                    <h3>{category.title}</h3>
                    <p>{category.lead}</p>
                    <ul>{category.options.map((option) => <li key={option}>{option}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
            <div className="material-samples">
              <div><p className="eyebrow">PHYSICAL SAMPLES</p><h2>{materialLibrary.sampleTitle}</h2><p>{materialLibrary.sampleBody}</p></div>
              <GoldLink href="/kontakt" solid>{materialLibrary.sampleCta}</GoldLink>
            </div>
          </section>

          <section className="material-criteria section-shell">
            <h2>{x.criteriaTitle}</h2>
            <div>{x.criteria.map(([criterion, text], index) => (
              <article key={criterion}><span>0{index + 1}</span><div><h3>{criterion}</h3><p>{text}</p></div><i><b style={{ width: `${31 + index * 16}%` }} /></i></article>
            ))}</div>
            <GoldLink href="/kontakt">{ui.discuss}</GoldLink>
          </section>

          <div className="section-shell"><ImageStatement kicker={x.materialContextKicker} title={x.materialContextTitle} body={x.materialContextBody} image="/media/kitchen-beams-angle.webp" cta={ui.projectCta} /></div>
          <section className="exact-final-cta material-planner-cta section-shell">
            <p className="eyebrow" translate="no">Dream Planner</p><h2>{x.plannerMaterialsTitle}</h2><p>{x.plannerMaterialsBody}</p>
            <PlannerControl className="button button-gold exact-link"><span><PlannerLabel text={t.plannerPrimary} /></span><ArrowRight size={18} /></PlannerControl>
          </section>
        </>
      )}

      {kind === "projects" && (
        <>
          <section className="projects-art exact-section section-shell">
            <div className="project-filter" aria-label={portfolio.all}>
              {(["all", "completed", "installation", "production"] as const).map((filter) => (
                <button className={projectFilter === filter ? "active" : ""} key={filter} onClick={() => setProjectFilter(filter)}>
                  {filter === "all" ? portfolio.all : portfolio[filter]}
                </button>
              ))}
            </div>
            <div className="projects-art-heading"><h2>{x.projectsIntro}</h2><strong>{String(projectCards.length).padStart(2, "0")}</strong></div>
            <div className="project-art-grid exact-project-grid">
              {projectCards.map((project, index) => (
                <article className={index === 0 ? "project-art-card wide" : "project-art-card"} key={project.slug}>
                  <picture className="project-card-media"><img src={project.cover} alt={project.copy[lang].title} loading={index > 2 ? "lazy" : "eager"} /></picture>
                  <span>{String(index + 1).padStart(2, "0")}</span><small>{project.copy[lang].category}</small>
                  <div>
                    <b className={`project-badge status-${project.status}`}>{portfolio[project.status]}</b>
                    <h2>{project.copy[lang].title}</h2>
                    <p>{project.copy[lang].details}</p>
                    <GoldLink href={`/realizace/${project.slug}`}>{portfolio.open}</GoldLink>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="project-final-cta">
            <img src="/media/kitchen-sink-detail.webp" alt="" />
            <span className="project-final-shade" />
            <div>
              <p className="eyebrow">{x.contactKicker}</p><h2>{x.nextProjectTitle}</h2><p>{t.projectsBody}</p>
              <div className="project-final-actions"><GoldLink href="/kontakt" solid>{ui.discuss}</GoldLink><PlannerControl className="exact-link"><span><PlannerLabel text={t.plannerPrimary} /></span><ArrowRight size={18} /></PlannerControl></div>
              <a href="mailto:info@maksteratelier.com">info@maksteratelier.com</a>
            </div>
          </section>
        </>
      )}

      {kind === "about" && (
        <>
          <section className="about-direct section-shell"><h2>{x.aboutDirect}</h2><span /></section>
          <section className="team-art exact-section section-shell">
            <div className="exact-section-head"><h2>{teamLabels[lang]}</h2><p>{x.aboutTeamBody}</p></div>
            <div className="team-art-grid exact-team-grid">
              {t.team.map(([name, role], index) => (
                <article key={name}><div className="team-art-photo"><img src={teamImages[index]} alt={name} /><span>0{index + 1}</span></div><h2 translate="no">{name}</h2><p>{role}</p><i /></article>
              ))}
            </div>
          </section>

          <section className="responsibility section-shell">
            <h2>{x.responsibilityTitle}</h2><p>{x.responsibilityBody}</p>
            <div>{x.responsibilitySteps.map(([step, text], index) => <article key={step}><span>0{index + 1}</span><h3>{step}</h3><p>{text}</p></article>)}</div>
            <GoldLink href="/jak-pracujeme">{x.routeCta}</GoldLink>
          </section>
          <div className="section-shell"><ImageStatement kicker={x.realityKicker} title={x.realityTitle} body={x.realityBody} image="/media/kitchen-beams-front.webp" cta={ui.viewProjects} href="/realizace" /></div>
          <section className="exact-final-cta section-shell"><p className="eyebrow">{x.contactKicker}</p><h2>{t.aboutTitle}</h2><GoldLink href="/kontakt" solid>{ui.projectCta}</GoldLink></section>
        </>
      )}

      {kind === "contact" && (
        <>
          <div className="contact-desktop-grid">
          <section className="contact-exact-hero">
            <img src={heroImages.contact} alt="" /><span />
            <div className="section-shell contact-exact-intro">
              <p className="eyebrow">{t.contactKicker}</p><h1>{t.contactTitle}</h1><p>{t.contactBody}</p>
              <div className="contact-lines">
                <a href="tel:+420720472811"><small>TEL</small><span>+420 720 472 811</span></a>
                <a href="mailto:info@maksteratelier.com"><small>MAIL</small><span>info@maksteratelier.com</span></a>
                <a href="https://wa.me/420720472811"><small>WA</small><span>WhatsApp</span></a>
                <span><small>{x.locationLabel}</small>{t.location}</span>
              </div>
              <PlannerControl className="button button-gold exact-link"><span><PlannerLabel text={t.plannerPrimary} /></span><ArrowRight size={18} /></PlannerControl>
            </div>
          </section>

          <section className="contact-art exact-section section-shell">
            <div className="contact-form-title"><p className="eyebrow">{x.formKicker}</p><h2>{t.form[2]}.</h2></div>
            <form className="contact-art-form exact-contact-form" onSubmit={submitEnquiry}>
              <input className="form-honeypot" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <label>{t.form[0]}<input name="name" required autoComplete="name" /></label>
              <label>{t.form[1]}<input name="contact" required autoComplete="email" /></label>
              <fieldset><legend>{x.projectTypeLabel}</legend>{x.projectTypes.map((type, index) => <label key={type}><input type="radio" name="type" value={type} defaultChecked={index === 0} /><span>0{index + 1}</span>{type}</label>)}</fieldset>
              <label>{t.location}<input name="city" /></label>
              <label>{t.form[2]}<textarea name="project" required rows={5} /></label>
              <label className="upload-field upload-line"><span><Upload size={22} /><b>{x.attachments}</b></span><input name="files" type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp" /><small>{enquiryFeedback[lang].files}</small></label>
              <button className="button button-gold" type="submit" disabled={enquiryState === "sending"}>{enquiryState === "sending" ? enquiryFeedback[lang].sending : t.form[3]}<ArrowRight size={18} /></button>
              {enquiryState !== "idle" && enquiryState !== "sending" && <p className={`form-status ${enquiryState}`} role="status" aria-live="polite">{enquiryFeedback[lang][enquiryState]}</p>}
              <small className="privacy-line">{x.privacy}</small>
            </form>
          </section>
          </div>

          <section className="contact-direct section-shell">
            <img src="/media/kitchen-sink-detail.webp" alt="" /><span />
            <div><p className="eyebrow">{x.contactDirectKicker}</p><h2>{x.contactDirectTitle}</h2><a href="tel:+420720472811">+420 720 472 811</a><a href="mailto:info@maksteratelier.com">info@maksteratelier.com</a><GoldLink href="https://wa.me/420720472811">{x.contactDirectCta}</GoldLink></div>
          </section>
        </>
      )}

      <SiteFooter lang={lang} onLanguage={changeLanguage} />
    </main>
  );
}
