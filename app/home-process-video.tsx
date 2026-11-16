"use client";

import Link from "next/link";
import { ArrowRight, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "./content";

const VIDEO_SRC = "/media/process-video/makster-final-15s.mp4";
const POSTER_SRC = "/media/process-video/makster-final-poster.webp";

const processVideoCopy: Record<Lang, {
  kicker: string;
  title: string;
  lead: string;
  body: string;
  stages: string[];
  cta: string;
  caption: string;
  play: string;
  pause: string;
  replay: string;
  soundOn: string;
  soundOff: string;
}> = {
  cs: {
    kicker: "OD NÁVRHU K REALIZACI",
    title: "Jak pracujeme",
    lead: "Od prvního náčrtu až po dokonalý interiér.",
    body: "Každý projekt začíná představou. My ji proměňujeme v promyšlený návrh, precizně vyrobený nábytek a interiér na míru.",
    stages: ["Návrh", "Výroba", "Realizace"],
    cta: "Poznejte, jak pracujeme",
    caption: "Designová vizualizace – koncept, nikoli realizovaný projekt.",
    play: "Přehrát video",
    pause: "Pozastavit video",
    replay: "Přehrát znovu",
    soundOn: "Zapnout zvuk",
    soundOff: "Vypnout zvuk",
  },
  ru: {
    kicker: "ОТ ПРОЕКТА К РЕАЛИЗАЦИИ",
    title: "Как мы работаем",
    lead: "От первого эскиза до совершенного интерьера.",
    body: "Каждый проект начинается с идеи. Мы превращаем её в продуманный проект, точно изготовленную мебель и индивидуальный интерьер.",
    stages: ["Проект", "Производство", "Реализация"],
    cta: "Узнать, как мы работаем",
    caption: "Дизайнерская визуализация — концепция, а не реализованный проект.",
    play: "Воспроизвести видео",
    pause: "Поставить видео на паузу",
    replay: "Воспроизвести снова",
    soundOn: "Включить звук",
    soundOff: "Выключить звук",
  },
  ua: {
    kicker: "ВІД ПРОЄКТУ ДО РЕАЛІЗАЦІЇ",
    title: "Як ми працюємо",
    lead: "Від першого ескізу до досконалого інтер’єру.",
    body: "Кожен проєкт починається з ідеї. Ми перетворюємо її на продуманий проєкт, точно виготовлені меблі та індивідуальний інтер’єр.",
    stages: ["Проєкт", "Виробництво", "Реалізація"],
    cta: "Дізнатися, як ми працюємо",
    caption: "Дизайнерська візуалізація — концепція, а не реалізований проєкт.",
    play: "Відтворити відео",
    pause: "Призупинити відео",
    replay: "Відтворити знову",
    soundOn: "Увімкнути звук",
    soundOff: "Вимкнути звук",
  },
  en: {
    kicker: "FROM DESIGN TO REALITY",
    title: "How we work",
    lead: "From the first sketch to a perfectly resolved interior.",
    body: "Every project begins with an idea. We turn it into a considered design, precisely crafted furniture and a bespoke interior.",
    stages: ["Design", "Production", "Installation"],
    cta: "Discover how we work",
    caption: "Design visualization — a concept, not a completed project.",
    play: "Play video",
    pause: "Pause video",
    replay: "Replay video",
    soundOn: "Turn sound on",
    soundOff: "Turn sound off",
  },
  pl: {
    kicker: "OD PROJEKTU DO REALIZACJI",
    title: "Jak pracujemy",
    lead: "Od pierwszego szkicu do perfekcyjnie dopracowanego wnętrza.",
    body: "Każdy projekt zaczyna się od pomysłu. Przekształcamy go w przemyślany projekt, precyzyjnie wykonane meble i wnętrze na miarę.",
    stages: ["Projekt", "Produkcja", "Realizacja"],
    cta: "Poznaj nasz sposób pracy",
    caption: "Wizualizacja projektowa — koncepcja, nie zrealizowany projekt.",
    play: "Odtwórz film",
    pause: "Wstrzymaj film",
    replay: "Odtwórz ponownie",
    soundOn: "Włącz dźwięk",
    soundOff: "Wyłącz dźwięk",
  },
  de: {
    kicker: "VOM ENTWURF ZUR REALISIERUNG",
    title: "So arbeiten wir",
    lead: "Von der ersten Skizze bis zum vollkommenen Interieur.",
    body: "Jedes Projekt beginnt mit einer Idee. Wir entwickeln daraus einen durchdachten Entwurf, präzise gefertigte Möbel und ein maßgeschneidertes Interieur.",
    stages: ["Entwurf", "Fertigung", "Realisierung"],
    cta: "Erfahren Sie, wie wir arbeiten",
    caption: "Designvisualisierung — ein Konzept, kein realisiertes Projekt.",
    play: "Video abspielen",
    pause: "Video pausieren",
    replay: "Erneut abspielen",
    soundOn: "Ton einschalten",
    soundOff: "Ton ausschalten",
  },
};

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

export function HomeProcessVideo({ lang }: { lang: Lang }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingPlayRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [autoPlayAllowed, setAutoPlayAllowed] = useState(true);
  const text = processVideoCopy[lang];

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    setAutoPlayAllowed(!reducedMotion && !saveData);

    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting && !reducedMotion && !saveData) setLoaded(true);
    }, { rootMargin: "80px 0px", threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !loaded) return;
    if (!inView) {
      video.pause();
      return;
    }
    if (autoPlayAllowed && muted && !ended) {
      void video.play().catch(() => setPlaying(false));
    }
  }, [autoPlayAllowed, ended, inView, loaded, muted]);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!loaded) {
      pendingPlayRef.current = true;
      setLoaded(true);
      return;
    }
    if (ended) video.currentTime = 0;
    setEnded(false);
    void video.play();
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (playing) video?.pause();
    else playVideo();
  };

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  return (
    <section className="home-process-video" ref={sectionRef} aria-labelledby="home-process-video-title">
      <div className="section-shell home-process-video-shell">
        <div className="home-process-video-copy">
          <p className="eyebrow">{text.kicker}</p>
          <h2 id="home-process-video-title">{text.title}</h2>
          <h3>{text.lead}</h3>
          <p>{text.body}</p>
          <ol className="home-process-video-stages">
            {text.stages.map((stage, index) => <li key={stage}><span>0{index + 1}</span>{stage}</li>)}
          </ol>
          <Link className="button button-outline home-process-video-link" href="/jak-pracujeme">
            {text.cta}<ArrowRight size={18} />
          </Link>
        </div>

        <figure className="home-process-video-figure">
          <div className="home-process-video-frame">
            <video
              ref={videoRef}
              aria-label={text.lead}
              poster={POSTER_SRC}
              preload="none"
              playsInline
              muted={muted}
              src={loaded ? VIDEO_SRC : undefined}
              onCanPlay={() => {
                if (pendingPlayRef.current) {
                  pendingPlayRef.current = false;
                  void videoRef.current?.play();
                }
              }}
              onPlay={() => { setPlaying(true); setEnded(false); }}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setEnded(true); }}
            />
            {!playing && (
              <button className="home-process-video-primary" type="button" onClick={playVideo} aria-label={ended ? text.replay : text.play}>
                {ended ? <RotateCcw size={26} /> : <Play size={28} fill="currentColor" />}
                <span>{ended ? text.replay : text.play}</span>
              </button>
            )}
            <div className="home-process-video-controls">
              <button type="button" onClick={togglePlayback} aria-label={playing ? text.pause : ended ? text.replay : text.play}>
                {playing ? <Pause size={18} fill="currentColor" /> : ended ? <RotateCcw size={18} /> : <Play size={18} fill="currentColor" />}
              </button>
              <button type="button" onClick={toggleSound} aria-label={muted ? text.soundOn : text.soundOff} aria-pressed={!muted}>
                {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
            </div>
          </div>
          <figcaption>{text.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
