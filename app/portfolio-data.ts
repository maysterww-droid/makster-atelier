import type { Lang } from "./content";

export type ProjectStatus = "completed" | "installation" | "production";

type ProjectCopy = {
  title: string;
  category: string;
  details: string;
};

export type PortfolioProject = {
  slug: string;
  status: ProjectStatus;
  cover: string;
  hero?: string;
  images: string[];
  featured?: boolean;
  copy: Record<Lang, ProjectCopy>;
};

export const portfolioUi: Record<Lang, {
  all: string;
  completed: string;
  installation: string;
  production: string;
  open: string;
  back: string;
  gallery: string;
  result: string;
}> = {
  ru: { all: "Все проекты", completed: "Готово", installation: "Монтаж", production: "Производство", open: "Смотреть проект", back: "Все реализации", gallery: "Детали проекта", result: "Реальная работа нашей команды" },
  ua: { all: "Усі проєкти", completed: "Готово", installation: "Монтаж", production: "Виробництво", open: "Дивитися проєкт", back: "Усі реалізації", gallery: "Деталі проєкту", result: "Реальна робота нашої команди" },
  cs: { all: "Všechny projekty", completed: "Dokončeno", installation: "Montáž", production: "Výroba", open: "Zobrazit projekt", back: "Všechny realizace", gallery: "Detail projektu", result: "Skutečná práce našeho týmu" },
  en: { all: "All projects", completed: "Completed", installation: "Installation", production: "Production", open: "View project", back: "All projects", gallery: "Project details", result: "Real work by our team" },
  pl: { all: "Wszystkie projekty", completed: "Gotowe", installation: "Montaż", production: "Produkcja", open: "Zobacz projekt", back: "Wszystkie realizacje", gallery: "Szczegóły projektu", result: "Prawdziwa praca naszego zespołu" },
  de: { all: "Alle Projekte", completed: "Fertiggestellt", installation: "Montage", production: "Fertigung", open: "Projekt ansehen", back: "Alle Projekte", gallery: "Projektdetails", result: "Echte Arbeit unseres Teams" },
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "kitchen-oak-light",
    status: "completed",
    cover: "/media/projects/kitchen-oak-light-cover.webp",
    images: ["/media/projects/kitchen-oak-light-cover.webp", "/media/projects/kitchen-oak-light-wide.webp", "/media/projects/kitchen-oak-light-detail.webp"],
    featured: true,
    copy: {
      ru: { title: "Светлая кухня с дубом", category: "Кухня на заказ", details: "Матовые фасады · дубовый декор · встроенный свет" },
      ua: { title: "Світла кухня з дубом", category: "Кухня на замовлення", details: "Матові фасади · дубовий декор · вбудоване світло" },
      cs: { title: "Světlá kuchyň s dubem", category: "Kuchyň na míru", details: "Matná čela · dubový dekor · integrované světlo" },
      en: { title: "Light kitchen with oak", category: "Bespoke kitchen", details: "Matt fronts · oak décor · integrated lighting" },
      pl: { title: "Jasna kuchnia z dębem", category: "Kuchnia na wymiar", details: "Matowe fronty · dekor dębowy · zintegrowane światło" },
      de: { title: "Helle Küche mit Eiche", category: "Küche nach Maß", details: "Matte Fronten · Eichendekor · integriertes Licht" },
    },
  },
  {
    slug: "kitchen-under-beams",
    status: "completed",
    cover: "/media/projects/kitchen-beams-cover.webp",
    images: ["/media/projects/kitchen-beams-cover.webp", "/media/projects/kitchen-beams-wide.webp", "/media/projects/kitchen-beams-detail.webp"],
    featured: true,
    copy: {
      ru: { title: "Кухня под историческими балками", category: "Кухня на заказ", details: "Точная подгонка · сложная геометрия · готовый интерьер" },
      ua: { title: "Кухня під історичними балками", category: "Кухня на замовлення", details: "Точне припасування · складна геометрія · готовий інтер’єр" },
      cs: { title: "Kuchyň pod historickými trámy", category: "Kuchyň na míru", details: "Přesné napojení · složitá geometrie · hotový interiér" },
      en: { title: "Kitchen beneath historic beams", category: "Bespoke kitchen", details: "Precise fitting · complex geometry · finished interior" },
      pl: { title: "Kuchnia pod historycznymi belkami", category: "Kuchnia na wymiar", details: "Precyzyjne dopasowanie · trudna geometria · gotowe wnętrze" },
      de: { title: "Küche unter historischen Balken", category: "Küche nach Maß", details: "Präzise Anpassung · komplexe Geometrie · fertiges Interieur" },
    },
  },
  {
    slug: "salon-partition",
    status: "completed",
    cover: "/media/projects/salon-partition-cover.webp",
    images: ["/media/projects/salon-partition-cover.webp", "/media/projects/salon-partition-detail.webp"],
    featured: true,
    copy: {
      ru: { title: "Световая перегородка для салона", category: "Коммерческий интерьер", details: "Шпон · зеркала · стекло · интегрированная подсветка" },
      ua: { title: "Світлова перегородка для салону", category: "Комерційний інтер’єр", details: "Шпон · дзеркала · скло · інтегроване підсвічування" },
      cs: { title: "Světelná příčka pro salon", category: "Komerční interiér", details: "Dýha · zrcadla · sklo · integrované osvětlení" },
      en: { title: "Illuminated salon partition", category: "Commercial interior", details: "Veneer · mirrors · glass · integrated lighting" },
      pl: { title: "Podświetlana przegroda do salonu", category: "Wnętrze komercyjne", details: "Fornir · lustra · szkło · zintegrowane oświetlenie" },
      de: { title: "Beleuchtete Salontrennwand", category: "Gewerbeinterieur", details: "Furnier · Spiegel · Glas · integrierte Beleuchtung" },
    },
  },
  {
    slug: "salon-interior",
    status: "completed",
    cover: "/media/projects/salon-interior-cover.webp",
    hero: "/media/projects/salon-interior-reception.webp",
    images: ["/media/projects/salon-interior-cover.webp", "/media/projects/salon-interior-reception.webp", "/media/projects/salon-interior-detail.webp"],
    copy: {
      ru: { title: "Мебель для салона", category: "Коммерческий интерьер", details: "Рабочие места · стойка · витрины · единый материал" },
      ua: { title: "Меблі для салону", category: "Комерційний інтер’єр", details: "Робочі місця · стійка · вітрини · єдиний матеріал" },
      cs: { title: "Nábytek pro salon", category: "Komerční interiér", details: "Pracovní místa · recepce · vitríny · jednotný materiál" },
      en: { title: "Furniture for a salon", category: "Commercial interior", details: "Workstations · reception · displays · one material language" },
      pl: { title: "Meble do salonu", category: "Wnętrze komercyjne", details: "Stanowiska · recepcja · witryny · spójny materiał" },
      de: { title: "Möbel für einen Salon", category: "Gewerbeinterieur", details: "Arbeitsplätze · Empfang · Vitrinen · einheitliches Material" },
    },
  },
  {
    slug: "complete-apartment",
    status: "completed",
    cover: "/media/projects/apartment-living-cover.webp",
    images: ["/media/projects/apartment-living-cover.webp", "/media/projects/apartment-kitchen.webp", "/media/projects/apartment-dining.webp", "/media/projects/apartment-bedroom.webp"],
    featured: true,
    copy: {
      ru: { title: "Меблировка квартиры", category: "Комплексный интерьер", details: "Кухня · гостиная · столовая · спальни · гардеробная" },
      ua: { title: "Меблювання квартири", category: "Комплексний інтер’єр", details: "Кухня · вітальня · їдальня · спальні · гардеробна" },
      cs: { title: "Kompletní vybavení bytu", category: "Kompletní interiér", details: "Kuchyň · obývací pokoj · jídelna · ložnice · šatna" },
      en: { title: "Complete apartment furnishing", category: "Complete interior", details: "Kitchen · living room · dining · bedrooms · dressing room" },
      pl: { title: "Kompleksowe umeblowanie mieszkania", category: "Kompletne wnętrze", details: "Kuchnia · salon · jadalnia · sypialnie · garderoba" },
      de: { title: "Komplette Wohnungseinrichtung", category: "Komplettes Interieur", details: "Küche · Wohnen · Essen · Schlafzimmer · Ankleide" },
    },
  },
  {
    slug: "wine-cellar",
    status: "completed",
    cover: "/media/projects/wine-cellar-cover.webp",
    images: ["/media/projects/wine-cellar-cover.webp", "/media/projects/wine-cellar-detail.webp", "/media/projects/wine-cellar-bar.webp"],
    featured: true,
    copy: {
      ru: { title: "Винная комната", category: "Нестандартная мебель", details: "Стеллажи · винные ячейки · бар · сложная архитектура" },
      ua: { title: "Винна кімната", category: "Нестандартні меблі", details: "Стелажі · винні комірки · бар · складна архітектура" },
      cs: { title: "Vinotéka na míru", category: "Atypický nábytek", details: "Regály · vinotéka · bar · složitá architektura" },
      en: { title: "Bespoke wine room", category: "Custom furniture", details: "Shelving · wine storage · bar · complex architecture" },
      pl: { title: "Pokój winny", category: "Meble nietypowe", details: "Regały · stojaki na wino · bar · złożona architektura" },
      de: { title: "Weinraum nach Maß", category: "Sondermöbel", details: "Regale · Weinlagerung · Bar · komplexe Architektur" },
    },
  },
  {
    slug: "ivory-classic-interior",
    status: "completed",
    cover: "/media/projects/ivory-classic-range.webp",
    hero: "/media/projects/ivory-classic-vanity-wide.webp",
    images: [
      "/media/projects/ivory-classic-range.webp",
      "/media/projects/ivory-classic-carving.webp",
      "/media/projects/ivory-classic-vanity-wide.webp",
      "/media/projects/ivory-classic-vanity-detail.webp",
      "/media/projects/ivory-classic-mirror.webp",
      "/media/projects/ivory-classic-bathroom.webp",
    ],
    copy: {
      ru: { title: "Классический интерьер в цвете слоновой кости", category: "Комплексный интерьер", details: "Кухня · мебель для ванной · резной декор · витражи" },
      ua: { title: "Класичний інтер’єр кольору слонової кістки", category: "Комплексний інтер’єр", details: "Кухня · меблі для ванної · різьблений декор · вітражі" },
      cs: { title: "Klasický interiér v odstínu slonové kosti", category: "Kompletní interiér", details: "Kuchyň · koupelnový nábytek · řezbářský dekor · vitráže" },
      en: { title: "Classic ivory interior", category: "Complete interior", details: "Kitchen · bathroom furniture · carved décor · stained glass" },
      pl: { title: "Klasyczne wnętrze w kolorze kości słoniowej", category: "Kompletne wnętrze", details: "Kuchnia · meble łazienkowe · rzeźbiony dekor · witraże" },
      de: { title: "Klassisches Interieur in Elfenbein", category: "Komplettes Interieur", details: "Küche · Badmöbel · Schnitzdekor · Bleiglas" },
    },
  },
  {
    slug: "grey-neoclassical-kitchen",
    status: "completed",
    cover: "/media/projects/grey-classic-kitchen-cover.webp",
    featured: true,
    images: [
      "/media/projects/grey-classic-kitchen-cover.webp",
      "/media/projects/grey-classic-display.webp",
      "/media/projects/grey-classic-vitrine.webp",
      "/media/projects/grey-classic-tall-units.webp",
    ],
    copy: {
      ru: { title: "Серая кухня в неоклассике", category: "Кухня на заказ", details: "Крашеные фасады · витрины с подсветкой · встроенная техника" },
      ua: { title: "Сіра кухня в неокласиці", category: "Кухня на замовлення", details: "Фарбовані фасади · вітрини з підсвічуванням · вбудована техніка" },
      cs: { title: "Šedá neoklasická kuchyň", category: "Kuchyň na míru", details: "Lakovaná čela · osvětlené vitríny · vestavné spotřebiče" },
      en: { title: "Grey neoclassical kitchen", category: "Bespoke kitchen", details: "Painted fronts · illuminated displays · integrated appliances" },
      pl: { title: "Szara kuchnia neoklasyczna", category: "Kuchnia na wymiar", details: "Lakierowane fronty · podświetlane witryny · zabudowane AGD" },
      de: { title: "Graue Küche im neoklassischen Stil", category: "Küche nach Maß", details: "Lackierte Fronten · beleuchtete Vitrinen · Einbaugeräte" },
    },
  },
  {
    slug: "hallway-storage",
    status: "installation",
    cover: "/media/projects/hallway-cover.webp",
    images: ["/media/projects/hallway-cover.webp", "/media/projects/hallway-laundry.webp", "/media/projects/hallway-detail.webp"],
    copy: {
      ru: { title: "Система хранения для квартиры", category: "Встроенные шкафы", details: "Прихожая · постирочная · внутреннее оснащение" },
      ua: { title: "Система зберігання для квартири", category: "Вбудовані шафи", details: "Передпокій · пральня · внутрішнє оснащення" },
      cs: { title: "Úložný systém pro byt", category: "Vestavěné skříně", details: "Předsíň · prádelna · vnitřní vybavení" },
      en: { title: "Apartment storage system", category: "Built-in wardrobes", details: "Hallway · laundry · internal fittings" },
      pl: { title: "System przechowywania w mieszkaniu", category: "Szafy w zabudowie", details: "Przedpokój · pralnia · wyposażenie wewnętrzne" },
      de: { title: "Stauraumsystem für eine Wohnung", category: "Einbauschränke", details: "Flur · Waschküche · Innenausstattung" },
    },
  },
  {
    slug: "green-oak-kitchen",
    status: "installation",
    cover: "/media/projects/green-oak-kitchen-cover.webp",
    images: ["/media/projects/green-oak-kitchen-cover.webp", "/media/projects/green-oak-kitchen-oak.webp", "/media/projects/green-oak-kitchen-wide.webp"],
    copy: {
      ru: { title: "Зелёная кухня с дубовой витриной", category: "Кухня на заказ", details: "Матовые фасады · дуб · стекло · монтаж на объекте" },
      ua: { title: "Зелена кухня з дубовою вітриною", category: "Кухня на замовлення", details: "Матові фасади · дуб · скло · монтаж на об’єкті" },
      cs: { title: "Zelená kuchyň s dubovou vitrínou", category: "Kuchyň na míru", details: "Matná čela · dub · sklo · montáž na místě" },
      en: { title: "Green kitchen with an oak display", category: "Bespoke kitchen", details: "Matt fronts · oak · glass · on-site installation" },
      pl: { title: "Zielona kuchnia z dębową witryną", category: "Kuchnia na wymiar", details: "Matowe fronty · dąb · szkło · montaż na miejscu" },
      de: { title: "Grüne Küche mit Eichenvitrine", category: "Küche nach Maß", details: "Matte Fronten · Eiche · Glas · Montage vor Ort" },
    },
  },
  {
    slug: "classic-craft",
    status: "production",
    cover: "/media/projects/classic-craft-cover.webp",
    images: ["/media/projects/classic-craft-cover.webp", "/media/projects/classic-craft-side.webp", "/media/projects/classic-craft-detail.webp"],
    copy: {
      ru: { title: "Классическая мебель в производстве", category: "Производство", details: "Радиусные детали · профиль · ручная золотая патина" },
      ua: { title: "Класичні меблі у виробництві", category: "Виробництво", details: "Радіусні деталі · профіль · ручна золота патина" },
      cs: { title: "Klasický nábytek ve výrobě", category: "Výroba", details: "Rádiusové díly · profil · ruční zlatá patina" },
      en: { title: "Classical furniture in production", category: "Production", details: "Curved details · moulding · hand-applied gold patina" },
      pl: { title: "Klasyczne meble w produkcji", category: "Produkcja", details: "Elementy gięte · profil · ręcznie nakładana złota patyna" },
      de: { title: "Klassische Möbel in Fertigung", category: "Fertigung", details: "Radienteile · Profil · handaufgetragene Goldpatina" },
    },
  },
];

export function getPortfolioProject(slug: string) {
  return portfolioProjects.find((project) => project.slug === slug);
}
