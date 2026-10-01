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
  coverPosition?: string;
  heroPosition?: string;
  heroLayout?: "portrait";
  images: string[];
  featured?: boolean;
  featuredRank?: number;
  wide?: boolean;
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
  selected: string;
  imageLabels: string[];
  features: [string, string, string];
  detailIntro: string;
  close: string;
}> = {
  ru: { all: "Все проекты", completed: "Готово", installation: "Монтаж", production: "Производство", open: "Смотреть проект", back: "Все реализации", gallery: "Детали проекта", result: "Реальная работа нашей команды", selected: "Избранные проекты", imageLabels: ["Общий вид", "Основной ракурс", "Композиция мебели", "Деталь конструкции", "Материалы и отделка", "Интерьер в пространстве", "Точная работа", "Финальный результат"], features: ["Индивидуальный проект", "Качественная фурнитура", "Точное исполнение"], detailIntro: "Каждый элемент изготовлен под конкретное пространство, выбранные материалы и реальный сценарий использования.", close: "Закрыть" },
  ua: { all: "Усі проєкти", completed: "Готово", installation: "Монтаж", production: "Виробництво", open: "Дивитися проєкт", back: "Усі реалізації", gallery: "Деталі проєкту", result: "Реальна робота нашої команди", selected: "Обрані проєкти", imageLabels: ["Загальний вигляд", "Основний ракурс", "Композиція меблів", "Деталь конструкції", "Матеріали й оздоблення", "Інтер’єр у просторі", "Точна робота", "Фінальний результат"], features: ["Індивідуальний проєкт", "Якісна фурнітура", "Точне виконання"], detailIntro: "Кожен елемент виготовлено для конкретного простору, обраних матеріалів і реального сценарію використання.", close: "Закрити" },
  cs: { all: "Všechny projekty", completed: "Dokončeno", installation: "Montáž", production: "Výroba", open: "Zobrazit projekt", back: "Všechny realizace", gallery: "Detail projektu", result: "Skutečná práce našeho týmu", selected: "Vybrané projekty", imageLabels: ["Celkový pohled", "Hlavní záběr", "Kompozice nábytku", "Konstrukční detail", "Materiály a povrchy", "Interiér v prostoru", "Precizní práce", "Finální výsledek"], features: ["Individuální projekt", "Kvalitní kování", "Přesné provedení"], detailIntro: "Každý prvek vznikl pro konkrétní prostor, zvolené materiály a skutečný způsob používání interiéru.", close: "Zavřít" },
  en: { all: "All projects", completed: "Completed", installation: "Installation", production: "Production", open: "View project", back: "All projects", gallery: "Project details", result: "Real work by our team", selected: "Selected projects", imageLabels: ["Overall view", "Main perspective", "Furniture composition", "Construction detail", "Materials and finish", "Interior in context", "Precise craftsmanship", "Final result"], features: ["Individual design", "Quality hardware", "Precise execution"], detailIntro: "Every element was made for the specific space, selected materials and the way the interior is used in real life.", close: "Close" },
  pl: { all: "Wszystkie projekty", completed: "Gotowe", installation: "Montaż", production: "Produkcja", open: "Zobacz projekt", back: "Wszystkie realizacje", gallery: "Szczegóły projektu", result: "Prawdziwa praca naszego zespołu", selected: "Wybrane projekty", imageLabels: ["Widok ogólny", "Główne ujęcie", "Kompozycja mebli", "Detal konstrukcji", "Materiały i wykończenie", "Wnętrze w przestrzeni", "Precyzyjne wykonanie", "Efekt końcowy"], features: ["Projekt indywidualny", "Wysokiej jakości okucia", "Precyzyjne wykonanie"], detailIntro: "Każdy element wykonaliśmy dla konkretnej przestrzeni, wybranych materiałów i rzeczywistego sposobu użytkowania wnętrza.", close: "Zamknij" },
  de: { all: "Alle Projekte", completed: "Fertiggestellt", installation: "Montage", production: "Fertigung", open: "Projekt ansehen", back: "Alle Projekte", gallery: "Projektdetails", result: "Echte Arbeit unseres Teams", selected: "Ausgewählte Projekte", imageLabels: ["Gesamtansicht", "Hauptperspektive", "Möbelkomposition", "Konstruktionsdetail", "Materialien und Oberflächen", "Interieur im Raum", "Präzise Handarbeit", "Fertiges Ergebnis"], features: ["Individuelle Planung", "Hochwertige Beschläge", "Präzise Ausführung"], detailIntro: "Jedes Element wurde für den konkreten Raum, die gewählten Materialien und die tatsächliche Nutzung des Interieurs gefertigt.", close: "Schließen" },
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "kitchen-oak-light",
    status: "completed",
    cover: "/media/projects/kitchen-oak-light-cover.webp",
    images: ["/media/projects/kitchen-oak-light-cover.webp", "/media/projects/kitchen-oak-light-wide.webp", "/media/projects/kitchen-oak-light-detail.webp"],
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
    featuredRank: 2,
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
    images: ["/media/projects/apartment-kitchen.webp", "/media/projects/apartment-dining.webp", "/media/projects/apartment-bedroom.webp"],
    copy: {
      ru: { title: "Меблировка квартиры", category: "Комплексный интерьер", details: "Кухня · столовая · спальни · гардеробная" },
      ua: { title: "Меблювання квартири", category: "Комплексний інтер’єр", details: "Кухня · їдальня · спальні · гардеробна" },
      cs: { title: "Kompletní vybavení bytu", category: "Kompletní interiér", details: "Kuchyň · jídelna · ložnice · šatna" },
      en: { title: "Complete apartment furnishing", category: "Complete interior", details: "Kitchen · dining · bedrooms · dressing room" },
      pl: { title: "Kompleksowe umeblowanie mieszkania", category: "Kompletne wnętrze", details: "Kuchnia · jadalnia · sypialnie · garderoba" },
      de: { title: "Komplette Wohnungseinrichtung", category: "Komplettes Interieur", details: "Küche · Essen · Schlafzimmer · Ankleide" },
    },
  },
  {
    slug: "wine-cellar",
    status: "completed",
    cover: "/media/projects/wine-cellar-cover.webp",
    images: ["/media/projects/wine-cellar-cover.webp", "/media/projects/wine-cellar-detail.webp", "/media/projects/wine-cellar-bar.webp"],
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
    slug: "gloss-walnut-kitchen",
    status: "completed",
    cover: "/media/projects/gloss-walnut-kitchen/cover.webp",
    hero: "/media/projects/gloss-walnut-kitchen/garden-view.webp",
    coverPosition: "center 52%",
    heroPosition: "center 50%",
    featured: true,
    featuredRank: 1,
    wide: true,
    images: [
      "/media/projects/gloss-walnut-kitchen/garden-view.webp",
      "/media/projects/gloss-walnut-kitchen/cover.webp",
      "/media/projects/gloss-walnut-kitchen/window-run.webp",
      "/media/projects/gloss-walnut-kitchen/appliance-wall.webp",
      "/media/projects/gloss-walnut-kitchen/island-detail.webp",
      "/media/projects/gloss-walnut-kitchen/peninsula-detail.webp",
    ],
    copy: {
      ru: { title: "Глянцевая кухня в орехе", category: "Кухня на заказ", details: "Ореховый декор · глянцевые фасады · остров · встроенная техника" },
      ua: { title: "Глянцева кухня в горіховому декорі", category: "Кухня на замовлення", details: "Горіховий декор · глянцеві фасади · острів · вбудована техніка" },
      cs: { title: "Lesklá kuchyň v ořechovém dekoru", category: "Kuchyň na míru", details: "Ořechový dekor · lesklá čela · ostrůvek · vestavné spotřebiče" },
      en: { title: "Gloss walnut kitchen", category: "Bespoke kitchen", details: "Walnut décor · gloss fronts · island · integrated appliances" },
      pl: { title: "Kuchnia w połysku z dekorem orzecha", category: "Kuchnia na wymiar", details: "Dekor orzecha · fronty w połysku · wyspa · zabudowane AGD" },
      de: { title: "Hochglanzküche in Walnuss", category: "Küche nach Maß", details: "Walnussdekor · Hochglanzfronten · Insel · Einbaugeräte" },
    },
  },
  {
    slug: "classic-childrens-room",
    status: "completed",
    cover: "/media/projects/classic-childrens-room/cover.webp",
    hero: "/media/projects/classic-childrens-room/wide.webp",
    featured: true,
    featuredRank: 3,
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
    featured: true,
    featuredRank: 4,
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
    featured: true,
    featuredRank: 5,
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
    featured: true,
    featuredRank: 6,
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
    featured: true,
    featuredRank: 7,
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
    slug: "mahogany-wardrobe",
    status: "completed",
    cover: "/media/projects/mahogany-wardrobe/cover.webp",
    hero: "/media/projects/mahogany-wardrobe/room-view.webp",
    coverPosition: "center 43%",
    heroPosition: "center 44%",
    heroLayout: "portrait",
    images: [
      "/media/projects/mahogany-wardrobe/cover.webp",
      "/media/projects/mahogany-wardrobe/front.webp",
      "/media/projects/mahogany-wardrobe/open.webp",
      "/media/projects/mahogany-wardrobe/crown-detail.webp",
      "/media/projects/mahogany-wardrobe/side-angle.webp",
      "/media/projects/mahogany-wardrobe/room-view.webp",
    ],
    copy: {
      ru: { title: "Классический шкаф из тёмного дерева", category: "Корпусная мебель на заказ", details: "Филенчатые фасады · карниз · внутреннее оснащение · точная столярная работа" },
      ua: { title: "Класична шафа з темного дерева", category: "Корпусні меблі на замовлення", details: "Фільончасті фасади · карниз · внутрішнє оснащення · точна столярна робота" },
      cs: { title: "Klasická skříň z tmavého dřeva", category: "Skříňový nábytek na míru", details: "Rámová dvířka · profilovaná římsa · vnitřní vybavení · precizní truhlářská práce" },
      en: { title: "Classic dark wood wardrobe", category: "Bespoke cabinet furniture", details: "Panelled fronts · moulded cornice · fitted interior · precise joinery" },
      pl: { title: "Klasyczna szafa z ciemnego drewna", category: "Meble skrzyniowe na wymiar", details: "Fronty płycinowe · profilowany gzyms · wyposażenie wnętrza · precyzyjne stolarstwo" },
      de: { title: "Klassischer Schrank aus dunklem Holz", category: "Korpusmöbel nach Maß", details: "Kassettenfronten · Profilkranz · Innenausstattung · präzise Tischlerarbeit" },
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
    slug: "striped-bedroom",
    status: "completed",
    cover: "/media/projects/striped-bedroom/cover.webp",
    hero: "/media/projects/striped-bedroom/bed-and-desk.webp",
    coverPosition: "center 54%",
    heroPosition: "center 55%",
    images: [
      "/media/projects/striped-bedroom/bed-and-desk.webp",
      "/media/projects/striped-bedroom/cover.webp",
      "/media/projects/striped-bedroom/wardrobe-front.webp",
      "/media/projects/striped-bedroom/wardrobe-angle.webp",
      "/media/projects/striped-bedroom/bed-detail.webp",
    ],
    copy: {
      ru: { title: "Белая спальня с полосатым декором", category: "Мебель для спальни на заказ", details: "Шкаф во всю стену · кровать · рабочий стол · единый графичный декор" },
      ua: { title: "Біла спальня зі смугастим декором", category: "Меблі для спальні на замовлення", details: "Шафа на всю стіну · ліжко · робочий стіл · єдиний графічний декор" },
      cs: { title: "Bílá ložnice s pruhovaným dekorem", category: "Nábytek do ložnice na míru", details: "Celostěnová skříň · postel · pracovní stůl · jednotný grafický dekor" },
      en: { title: "White bedroom with striped detailing", category: "Bespoke bedroom furniture", details: "Full-wall wardrobe · bed · desk · coordinated graphic detailing" },
      pl: { title: "Biała sypialnia z pasiastym dekorem", category: "Meble do sypialni na wymiar", details: "Szafa na całą ścianę · łóżko · biurko · spójny graficzny dekor" },
      de: { title: "Weißes Schlafzimmer mit Streifendekor", category: "Schlafzimmermöbel nach Maß", details: "Wandschrank · Bett · Schreibtisch · durchgängiges grafisches Dekor" },
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
