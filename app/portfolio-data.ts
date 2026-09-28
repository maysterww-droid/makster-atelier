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
    cover: "/media/projects/apartment-kitchen.webp",
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
    slug: "classic-childrens-room",
    status: "completed",
    cover: "/media/projects/classic-childrens-room/cover.webp",
    hero: "/media/projects/classic-childrens-room/wide.webp",
    featured: true,
    images: [
      "/media/projects/classic-childrens-room/cover.webp",
      "/media/projects/classic-childrens-room/wide.webp",
      "/media/projects/classic-childrens-room/front.webp",
      "/media/projects/classic-childrens-room/wardrobes.webp",
      "/media/projects/classic-childrens-room/painted-fronts.webp",
      "/media/projects/classic-childrens-room/carved-bed.webp",
      "/media/projects/classic-childrens-room/desk-panel.webp",
      "/media/projects/classic-childrens-room/painted-detail.webp",
    ],
    copy: {
      ru: { title: "Классическая детская комната", category: "Комплексный интерьер", details: "Мебель по индивидуальному проекту · резной декор · ручная роспись" },
      ua: { title: "Класична дитяча кімната", category: "Комплексний інтер’єр", details: "Меблі за індивідуальним проєктом · різьблений декор · ручний розпис" },
      cs: { title: "Klasický dětský pokoj", category: "Kompletní interiér", details: "Nábytek na míru · řezbářský dekor · ruční malba" },
      en: { title: "Classic children’s room", category: "Complete interior", details: "Bespoke furniture · carved décor · hand-painted details" },
      pl: { title: "Klasyczny pokój dziecięcy", category: "Kompletne wnętrze", details: "Meble na wymiar · rzeźbiony dekor · ręczne malowanie" },
      de: { title: "Klassisches Kinderzimmer", category: "Komplettes Interieur", details: "Möbel nach Maß · Schnitzdekor · Handmalerei" },
    },
  },
  {
    slug: "mint-classic-kitchen",
    status: "completed",
    cover: "/media/projects/mint-classic-kitchen/cover.webp",
    hero: "/media/projects/mint-classic-kitchen/wide.webp",
    images: [
      "/media/projects/mint-classic-kitchen/cover.webp",
      "/media/projects/mint-classic-kitchen/wide.webp",
      "/media/projects/mint-classic-kitchen/worktop-view.webp",
      "/media/projects/mint-classic-kitchen/window-view.webp",
    ],
    copy: {
      ru: { title: "Светлая кухня с мятным акцентом", category: "Кухня на заказ", details: "Крашеные фасады · витрины с подсветкой · гранитная столешница" },
      ua: { title: "Світла кухня з м’ятним акцентом", category: "Кухня на замовлення", details: "Фарбовані фасади · вітрини з підсвічуванням · гранітна стільниця" },
      cs: { title: "Světlá kuchyň s mentolovým akcentem", category: "Kuchyň na míru", details: "Lakovaná čela · osvětlené vitríny · žulová pracovní deska" },
      en: { title: "Light kitchen with a mint accent", category: "Bespoke kitchen", details: "Painted fronts · illuminated displays · granite worktop" },
      pl: { title: "Jasna kuchnia z miętowym akcentem", category: "Kuchnia na wymiar", details: "Lakierowane fronty · podświetlane witryny · granitowy blat" },
      de: { title: "Helle Küche mit Mintakzent", category: "Küche nach Maß", details: "Lackierte Fronten · beleuchtete Vitrinen · Granitarbeitsplatte" },
    },
  },
  {
    slug: "classic-bathroom-furniture",
    status: "completed",
    cover: "/media/projects/ivory-classic-vanity-wide.webp",
    hero: "/media/projects/ivory-classic-bathroom.webp",
    images: [
      "/media/projects/ivory-classic-vanity-wide.webp",
      "/media/projects/ivory-classic-vanity-detail.webp",
      "/media/projects/ivory-classic-range.webp",
      "/media/projects/ivory-classic-carving.webp",
      "/media/projects/ivory-classic-mirror.webp",
      "/media/projects/ivory-classic-bathroom.webp",
    ],
    copy: {
      ru: { title: "Мебель для ванной в классическом стиле", category: "Мебель для ванной на заказ", details: "Тумба · столешница · зеркало · резной декор" },
      ua: { title: "Меблі для ванної у класичному стилі", category: "Меблі для ванної на замовлення", details: "Тумба · стільниця · дзеркало · різьблений декор" },
      cs: { title: "Klasický koupelnový nábytek", category: "Koupelnový nábytek na míru", details: "Skříňka · pracovní deska · zrcadlo · řezbářský dekor" },
      en: { title: "Classic bathroom furniture", category: "Bespoke bathroom furniture", details: "Vanity · worktop · mirror · carved décor" },
      pl: { title: "Klasyczne meble łazienkowe", category: "Meble łazienkowe na wymiar", details: "Szafka · blat · lustro · rzeźbiony dekor" },
      de: { title: "Klassische Badmöbel", category: "Badmöbel nach Maß", details: "Waschtisch · Arbeitsplatte · Spiegel · Schnitzdekor" },
    },
  },
  {
    slug: "ivory-classic-kitchen",
    status: "completed",
    cover: "/media/projects/ivory-classic-interior/kitchen-front.webp",
    hero: "/media/projects/ivory-classic-interior/dining-view.webp",
    images: [
      "/media/projects/ivory-classic-interior/kitchen-front.webp",
      "/media/projects/ivory-classic-interior/kitchen-angle.webp",
      "/media/projects/ivory-classic-interior/dining-view.webp",
      "/media/projects/ivory-classic-interior/living-view.webp",
      "/media/projects/ivory-classic-interior/cabinet-detail.webp",
      "/media/projects/ivory-classic-interior/stained-glass-detail.webp",
    ],
    copy: {
      ru: { title: "Классическая кухня цвета слоновой кости", category: "Кухня и столовая на заказ", details: "Кухня · обеденная зона · резной декор · витражи" },
      ua: { title: "Класична кухня кольору слонової кістки", category: "Кухня та їдальня на замовлення", details: "Кухня · обідня зона · різьблений декор · вітражі" },
      cs: { title: "Klasická kuchyň v odstínu slonové kosti", category: "Kuchyň a jídelna na míru", details: "Kuchyň · jídelní zóna · řezbářský dekor · vitráže" },
      en: { title: "Classic ivory kitchen", category: "Bespoke kitchen and dining area", details: "Kitchen · dining area · carved décor · stained glass" },
      pl: { title: "Klasyczna kuchnia w kolorze kości słoniowej", category: "Kuchnia i jadalnia na wymiar", details: "Kuchnia · jadalnia · rzeźbiony dekor · witraże" },
      de: { title: "Klassische Küche in Elfenbein", category: "Küche und Essbereich nach Maß", details: "Küche · Essbereich · Schnitzdekor · Bleiglas" },
    },
  },
  {
    slug: "wood-panel-bedroom",
    status: "completed",
    cover: "/media/projects/wood-panel-bedroom/4322.webp",
    hero: "/media/projects/wood-panel-bedroom/4320.webp",
    images: [
      "/media/projects/wood-panel-bedroom/4322.webp",
      "/media/projects/wood-panel-bedroom/4321.webp",
      "/media/projects/wood-panel-bedroom/4320.webp",
    ],
    copy: {
      ru: { title: "Спальня с деревянными панелями", category: "Мебель для спальни на заказ", details: "Стеновые панели · прикроватные тумбы · декоративные витрины" },
      ua: { title: "Спальня з дерев’яними панелями", category: "Меблі для спальні на замовлення", details: "Стінові панелі · приліжкові тумби · декоративні вітрини" },
      cs: { title: "Ložnice s dřevěnými panely", category: "Nábytek do ložnice na míru", details: "Obkladové panely · noční stolky · dekorativní vitríny" },
      en: { title: "Bedroom with wood wall panels", category: "Bespoke bedroom furniture", details: "Wall panels · bedside cabinets · decorative displays" },
      pl: { title: "Sypialnia z drewnianymi panelami", category: "Meble do sypialni na wymiar", details: "Panele ścienne · szafki nocne · dekoracyjne witryny" },
      de: { title: "Schlafzimmer mit Holzpaneelen", category: "Schlafzimmermöbel nach Maß", details: "Wandpaneele · Nachttische · dekorative Vitrinen" },
    },
  },
  {
    slug: "classic-wood-office",
    status: "completed",
    cover: "/media/projects/classic-wood-office/6682.webp",
    hero: "/media/projects/classic-wood-office/6727.webp",
    images: [
      "/media/projects/classic-wood-office/6682.webp",
      "/media/projects/classic-wood-office/6727.webp",
      "/media/projects/classic-wood-office/6719.webp",
      "/media/projects/classic-wood-office/6681.webp",
      "/media/projects/classic-wood-office/6680.webp",
    ],
    copy: {
      ru: { title: "Классический кабинет с деревянными панелями", category: "Кабинет на заказ", details: "Стеновые панели · встроенные шкафы · письменный стол · резной декор" },
      ua: { title: "Класичний кабінет з дерев’яними панелями", category: "Кабінет на замовлення", details: "Стінові панелі · вбудовані шафи · письмовий стіл · різьблений декор" },
      cs: { title: "Klasická pracovna s dřevěnými panely", category: "Pracovna na míru", details: "Obkladové panely · vestavné skříně · psací stůl · řezbářský dekor" },
      en: { title: "Classic study with wood panelling", category: "Bespoke home office", details: "Wall panelling · built-in cabinets · desk · carved décor" },
      pl: { title: "Klasyczny gabinet z drewnianymi panelami", category: "Gabinet na wymiar", details: "Panele ścienne · zabudowa · biurko · rzeźbiony dekor" },
      de: { title: "Klassisches Arbeitszimmer mit Holzpaneelen", category: "Arbeitszimmer nach Maß", details: "Wandpaneele · Einbauschränke · Schreibtisch · Schnitzdekor" },
    },
  },
  {
    slug: "dark-wood-library",
    status: "completed",
    cover: "/media/projects/dark-wood-library/7134.webp",
    hero: "/media/projects/dark-wood-library/7132.webp",
    images: [
      "/media/projects/dark-wood-library/7134.webp",
      "/media/projects/dark-wood-library/7133.webp",
      "/media/projects/dark-wood-library/7132.webp",
    ],
    copy: {
      ru: { title: "Большая библиотека из тёмного дерева", category: "Библиотека на заказ", details: "Открытые стеллажи · нижние шкафы · единая композиция по стене" },
      ua: { title: "Велика бібліотека з темного дерева", category: "Бібліотека на замовлення", details: "Відкриті стелажі · нижні шафи · єдина композиція вздовж стіни" },
      cs: { title: "Velká knihovna z tmavého dřeva", category: "Knihovna na míru", details: "Otevřené regály · spodní skříňky · souvislá stěnová sestava" },
      en: { title: "Large dark wood library", category: "Bespoke library", details: "Open shelving · lower cabinets · full-wall composition" },
      pl: { title: "Duża biblioteka z ciemnego drewna", category: "Biblioteka na wymiar", details: "Otwarte regały · dolne szafki · zabudowa całej ściany" },
      de: { title: "Große Bibliothek aus dunklem Holz", category: "Bibliothek nach Maß", details: "Offene Regale · Unterschränke · durchgehende Wandkomposition" },
    },
  },
  {
    slug: "white-bedroom-furniture",
    status: "completed",
    cover: "/media/projects/white-bedroom-furniture/7795.webp",
    hero: "/media/projects/white-bedroom-furniture/7791.webp",
    images: [
      "/media/projects/white-bedroom-furniture/7795.webp",
      "/media/projects/white-bedroom-furniture/7791.webp",
      "/media/projects/white-bedroom-furniture/7796.webp",
      "/media/projects/white-bedroom-furniture/7792.webp",
    ],
    copy: {
      ru: { title: "Белая мебель для спальни", category: "Мебель для спальни на заказ", details: "Кровать · комод · туалетный столик · зеркальный шкаф" },
      ua: { title: "Білі меблі для спальні", category: "Меблі для спальні на замовлення", details: "Ліжко · комод · туалетний столик · дзеркальна шафа" },
      cs: { title: "Bílý nábytek do ložnice", category: "Nábytek do ložnice na míru", details: "Postel · komoda · toaletní stolek · zrcadlová skříň" },
      en: { title: "White bedroom furniture", category: "Bespoke bedroom furniture", details: "Bed · chest of drawers · dressing table · mirrored wardrobe" },
      pl: { title: "Białe meble do sypialni", category: "Meble do sypialni na wymiar", details: "Łóżko · komoda · toaletka · szafa z lustrami" },
      de: { title: "Weiße Schlafzimmermöbel", category: "Schlafzimmermöbel nach Maß", details: "Bett · Kommode · Schminktisch · Spiegelschrank" },
    },
  },
  {
    slug: "classic-walnut-kitchen",
    status: "completed",
    cover: "/media/projects/classic-walnut-kitchen/7798.webp",
    hero: "/media/projects/classic-walnut-kitchen/7821.webp",
    images: [
      "/media/projects/classic-walnut-kitchen/7798.webp",
      "/media/projects/classic-walnut-kitchen/7799.webp",
      "/media/projects/classic-walnut-kitchen/7821.webp",
      "/media/projects/classic-walnut-kitchen/7807.webp",
      "/media/projects/classic-walnut-kitchen/7808.webp",
    ],
    copy: {
      ru: { title: "Классическая кухня из тёмного дерева", category: "Кухня на заказ", details: "Фасады из тёмного дерева · стеклянные витрины · остров-стол" },
      ua: { title: "Класична кухня з темного дерева", category: "Кухня на замовлення", details: "Фасади з темного дерева · скляні вітрини · острів-стіл" },
      cs: { title: "Klasická kuchyň z tmavého dřeva", category: "Kuchyň na míru", details: "Tmavá dřevěná dvířka · prosklené vitríny · stolový ostrůvek" },
      en: { title: "Classic dark wood kitchen", category: "Bespoke kitchen", details: "Dark wood fronts · glazed displays · table island" },
      pl: { title: "Klasyczna kuchnia z ciemnego drewna", category: "Kuchnia na wymiar", details: "Fronty z ciemnego drewna · przeszklone witryny · wyspa-stół" },
      de: { title: "Klassische Küche aus dunklem Holz", category: "Küche nach Maß", details: "Dunkle Holzfronten · Glasvitrinen · Tischinsel" },
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
