export const SUPPORTED_LOCALES = ['ru', 'en', 'cs', 'de', 'pl'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const OWNER_DEFAULT_LOCALE: Locale = 'ru';
export const FALLBACK_LOCALE: Locale = 'en';
export const INTL_LOCALES: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-GB',
  cs: 'cs-CZ',
  de: 'de-DE',
  pl: 'pl-PL',
};

const en = {
  appName: 'Makster Quote',
  workspace: 'Workshop',
  dashboard: 'Dashboard',
  projects: 'Projects',
  newQuote: 'New Quote',
  quotes: 'Quotes',
  analytics: 'Analytics',
  customers: 'Customers',
  priceBook: 'Price Book',
  cabinetLibrary: 'Cabinet Library',
  hardware: 'Hardware',
  pricingSettings: 'Margin & overhead',
  documentSettings: 'Documents / company details',
  billing: 'Plan & billing',
  readiness: 'System readiness',
  plan: 'Plan',
  signOut: 'Sign out',
  interfaceLanguage: 'Interface language',
  documentLanguage: 'Document language',
  projectSummary: 'Project Summary',
  cost: 'Cost',
  trueCost: 'True Cost',
  sellingPrice: 'Selling Price',
  profit: 'Profit',
  margin: 'Margin',
  markup: 'Markup',
  targetMargin: 'Target Margin',
  applyTargetMargin: 'Apply Target Margin',
  materials: 'Materials',
  fronts: 'Fronts',
  edges: 'Edges',
  production: 'Production',
  labour: 'Labour',
  delivery: 'Delivery',
  installation: 'Installation',
  overhead: 'Overhead',
  clientQuote: 'Client Quote',
  productionPackage: 'Production Package',
  addCabinet: 'Add Cabinet',
  draft: 'Draft',
  ready: 'Ready',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  metricProjects: 'Projects',
  metricQuotes: 'Quotes',
  metricCustomers: 'Customers',
  metricPriceBook: 'Price Book',
  allProjects: 'all projects →',
  quotePipeline: 'pipeline →',
  customerBase: 'customer base →',
  activePrices: 'active prices →',
  recentCalculations: 'Recent calculations',
  noCalculationsTitle: 'No calculations yet',
  noCalculationsText: 'Create your first project. Makster will keep it in the shared database and prepare it for a future handoff to Makster Pro.',
  createFirstQuote: 'Create first quote',
  priceBookEmptyTitle: 'Price Book is empty.',
  priceBookEmptyText: 'Until you add your own purchase prices, Makster will not invent costs.',
  fillPriceBook: 'Fill Price Book →',
  project: 'Project',
  type: 'Type',
  status: 'Status',
  currency: 'Currency',
  open: 'Open →',
  statusDraft: 'Draft',
  statusActive: 'Active',
  statusQuoted: 'Sent',
  statusApproved: 'Accepted',
  statusEngineering: 'Engineering',
  statusProduction: 'Production',
  statusInstalled: 'Installation',
  statusCompleted: 'Completed',
  statusArchived: 'Archive',
  search: 'Search',
  projectName: 'Project name',
  allStatuses: 'All statuses',
  find: 'Find',
  reset: 'Reset',
  allProjectsEyebrow: 'ALL PROJECTS',
  found: 'found',
  nothingFound: 'Nothing found',
  noProjectsFilterTitle: 'No projects match the selected filter',
  noProjectsFilterText: 'Change the search or create a new quote.',
  createQuote: 'Create quote',
  customer: 'Customer',
  modified: 'Modified',
  copy: 'Copy',
  archive: 'Archive',
  projectArchived: 'Project moved to archive.',
  createProject: 'Create project',
  homeBack: '← Dashboard',
  basicData: 'Basic data',
  furnitureDetailsNext: 'Furniture details are added on the next screen.',
  projectNameLabel: 'Project name',
  projectNamePlaceholder: 'For example, Novak Kitchen',
  furnitureType: 'Furniture type',
  cancel: 'Cancel',
  createAndOpen: 'Create and open',
  furnitureKitchen: 'Kitchen',
  furnitureWardrobe: 'Wardrobe',
  furnitureBuiltIn: 'Built-in furniture',
  furnitureCabinet: 'Single cabinet',
  furnitureSideboard: 'Sideboard / console',
  furnitureMixed: 'Mixed project',
  createProjectError: 'Could not create the project. Check the data and try again.',
} as const;

export type MessageKey = keyof typeof en;

const messages: Record<Locale, Record<MessageKey, string>> = {
  en,
  ru: {
    appName:'Makster Quote',workspace:'Мастерская',dashboard:'Главная',projects:'Проекты',newQuote:'Новый расчёт',quotes:'Предложения',analytics:'Аналитика',customers:'Клиенты',priceBook:'Прайс-лист',cabinetLibrary:'Библиотека модулей',hardware:'Фурнитура',pricingSettings:'Маржа и накладные',documentSettings:'Документы / реквизиты',billing:'Тариф и оплата',readiness:'Готовность системы',plan:'Тариф',signOut:'Выйти',interfaceLanguage:'Язык интерфейса',documentLanguage:'Язык документа',projectSummary:'Итог по проекту',cost:'Себестоимость',trueCost:'Полная себестоимость',sellingPrice:'Цена продажи',profit:'Прибыль',margin:'Маржа',markup:'Наценка',targetMargin:'Целевая маржа',applyTargetMargin:'Применить целевую маржу',materials:'Материалы',fronts:'Фасады',edges:'Кромка',production:'Производство',labour:'Работа',delivery:'Доставка',installation:'Монтаж',overhead:'Накладные расходы',clientQuote:'Предложение клиенту',productionPackage:'Производственный пакет',addCabinet:'Добавить модуль',draft:'Черновик',ready:'Готов',sent:'Отправлен',accepted:'Принят',rejected:'Отклонён',metricProjects:'Проектов',metricQuotes:'Предложений',metricCustomers:'Клиентов',metricPriceBook:'Прайс-лист',allProjects:'все проекты →',quotePipeline:'pipeline →',customerBase:'база клиентов →',activePrices:'активные цены →',recentCalculations:'Последние расчёты',noCalculationsTitle:'Пока нет ни одного расчёта',noCalculationsText:'Создайте первый проект. Makster сохранит его в общей базе и подготовит для будущего перехода в Makster Pro.',createFirstQuote:'Создать первый расчёт',priceBookEmptyTitle:'Прайс-лист пуст.',priceBookEmptyText:'До добавления своих закупочных цен Makster не будет подставлять вымышленные стоимости.',fillPriceBook:'Заполнить прайс-лист →',project:'Проект',type:'Тип',status:'Статус',currency:'Валюта',open:'Открыть →',statusDraft:'Черновик',statusActive:'Активный',statusQuoted:'Отправлен',statusApproved:'Принят',statusEngineering:'Инженерия',statusProduction:'Производство',statusInstalled:'Монтаж',statusCompleted:'Завершён',statusArchived:'Архив',search:'Поиск',projectName:'Название проекта',allStatuses:'Все статусы',find:'Найти',reset:'Сбросить',allProjectsEyebrow:'ВСЕ ПРОЕКТЫ',found:'найдено',nothingFound:'Ничего не найдено',noProjectsFilterTitle:'Нет проектов по выбранному фильтру',noProjectsFilterText:'Измените поиск или создайте новый расчёт.',createQuote:'Создать расчёт',customer:'Клиент',modified:'Изменён',copy:'Копия',archive:'Архив',projectArchived:'Проект перемещён в архив.',createProject:'Создать проект',homeBack:'← Главная',basicData:'Основные данные',furnitureDetailsNext:'Детали мебели добавим на следующем экране.',projectNameLabel:'Название проекта',projectNamePlaceholder:'Например, Кухня Novák',furnitureType:'Тип мебели',cancel:'Отмена',createAndOpen:'Создать и открыть',furnitureKitchen:'Кухня',furnitureWardrobe:'Шкаф',furnitureBuiltIn:'Встроенная мебель',furnitureCabinet:'Отдельный корпус',furnitureSideboard:'Комод / тумба',furnitureMixed:'Смешанный проект',createProjectError:'Не удалось создать проект. Проверьте данные и повторите.',
  },
  cs: {
    appName:'Makster Quote',workspace:'Dílna',dashboard:'Přehled',projects:'Projekty',newQuote:'Nová kalkulace',quotes:'Nabídky',analytics:'Analytika',customers:'Zákazníci',priceBook:'Ceník',cabinetLibrary:'Knihovna skříněk',hardware:'Kování',pricingSettings:'Marže a režie',documentSettings:'Dokumenty / firemní údaje',billing:'Tarif a platby',readiness:'Připravenost systému',plan:'Tarif',signOut:'Odhlásit se',interfaceLanguage:'Jazyk rozhraní',documentLanguage:'Jazyk dokumentu',projectSummary:'Souhrn projektu',cost:'Náklady',trueCost:'Skutečné náklady',sellingPrice:'Prodejní cena',profit:'Zisk',margin:'Marže',markup:'Přirážka',targetMargin:'Cílová marže',applyTargetMargin:'Použít cílovou marži',materials:'Materiály',fronts:'Čela',edges:'Hrany',production:'Výroba',labour:'Práce',delivery:'Doprava',installation:'Montáž',overhead:'Režie',clientQuote:'Nabídka zákazníkovi',productionPackage:'Výrobní podklady',addCabinet:'Přidat skříňku',draft:'Koncept',ready:'Připraveno',sent:'Odesláno',accepted:'Přijato',rejected:'Odmítnuto',metricProjects:'Projekty',metricQuotes:'Nabídky',metricCustomers:'Zákazníci',metricPriceBook:'Ceník',allProjects:'všechny projekty →',quotePipeline:'pipeline →',customerBase:'databáze zákazníků →',activePrices:'aktivní ceny →',recentCalculations:'Poslední kalkulace',noCalculationsTitle:'Zatím žádná kalkulace',noCalculationsText:'Vytvořte první projekt. Makster jej uloží do společné databáze a připraví pro budoucí předání do Makster Pro.',createFirstQuote:'Vytvořit první kalkulaci',priceBookEmptyTitle:'Ceník je prázdný.',priceBookEmptyText:'Dokud nepřidáte vlastní nákupní ceny, Makster nebude vymýšlet náklady.',fillPriceBook:'Doplnit ceník →',project:'Projekt',type:'Typ',status:'Stav',currency:'Měna',open:'Otevřít →',statusDraft:'Koncept',statusActive:'Aktivní',statusQuoted:'Odesláno',statusApproved:'Přijato',statusEngineering:'Technická příprava',statusProduction:'Výroba',statusInstalled:'Montáž',statusCompleted:'Dokončeno',statusArchived:'Archiv',search:'Hledat',projectName:'Název projektu',allStatuses:'Všechny stavy',find:'Najít',reset:'Zrušit filtr',allProjectsEyebrow:'VŠECHNY PROJEKTY',found:'nalezeno',nothingFound:'Nic nenalezeno',noProjectsFilterTitle:'Žádný projekt neodpovídá filtru',noProjectsFilterText:'Změňte hledání nebo vytvořte novou kalkulaci.',createQuote:'Vytvořit kalkulaci',customer:'Zákazník',modified:'Upraveno',copy:'Kopie',archive:'Archivovat',projectArchived:'Projekt byl přesunut do archivu.',createProject:'Vytvořit projekt',homeBack:'← Přehled',basicData:'Základní údaje',furnitureDetailsNext:'Detaily nábytku přidáte na další obrazovce.',projectNameLabel:'Název projektu',projectNamePlaceholder:'Například Kuchyně Novák',furnitureType:'Typ nábytku',cancel:'Zrušit',createAndOpen:'Vytvořit a otevřít',furnitureKitchen:'Kuchyně',furnitureWardrobe:'Skříň',furnitureBuiltIn:'Vestavěný nábytek',furnitureCabinet:'Samostatná skříňka',furnitureSideboard:'Komoda / skříňka',furnitureMixed:'Smíšený projekt',createProjectError:'Projekt se nepodařilo vytvořit. Zkontrolujte údaje a zkuste to znovu.',
  },
  de: {
    appName:'Makster Quote',workspace:'Werkstatt',dashboard:'Übersicht',projects:'Projekte',newQuote:'Neue Kalkulation',quotes:'Angebote',analytics:'Analytik',customers:'Kunden',priceBook:'Preisliste',cabinetLibrary:'Schrankbibliothek',hardware:'Beschläge',pricingSettings:'Marge & Gemeinkosten',documentSettings:'Dokumente / Firmendaten',billing:'Tarif & Abrechnung',readiness:'Systembereitschaft',plan:'Tarif',signOut:'Abmelden',interfaceLanguage:'Sprache der Oberfläche',documentLanguage:'Dokumentsprache',projectSummary:'Projektübersicht',cost:'Kosten',trueCost:'Vollkosten',sellingPrice:'Verkaufspreis',profit:'Gewinn',margin:'Marge',markup:'Aufschlag',targetMargin:'Zielmarge',applyTargetMargin:'Zielmarge anwenden',materials:'Materialien',fronts:'Fronten',edges:'Kanten',production:'Produktion',labour:'Arbeit',delivery:'Lieferung',installation:'Montage',overhead:'Gemeinkosten',clientQuote:'Kundenangebot',productionPackage:'Produktionsunterlagen',addCabinet:'Schrank hinzufügen',draft:'Entwurf',ready:'Bereit',sent:'Gesendet',accepted:'Angenommen',rejected:'Abgelehnt',metricProjects:'Projekte',metricQuotes:'Angebote',metricCustomers:'Kunden',metricPriceBook:'Preisliste',allProjects:'alle Projekte →',quotePipeline:'Pipeline →',customerBase:'Kundenstamm →',activePrices:'aktive Preise →',recentCalculations:'Letzte Kalkulationen',noCalculationsTitle:'Noch keine Kalkulationen',noCalculationsText:'Erstellen Sie das erste Projekt. Makster speichert es in der gemeinsamen Datenbank und bereitet es für die spätere Übergabe an Makster Pro vor.',createFirstQuote:'Erste Kalkulation erstellen',priceBookEmptyTitle:'Die Preisliste ist leer.',priceBookEmptyText:'Solange Sie keine eigenen Einkaufspreise hinterlegen, erfindet Makster keine Kosten.',fillPriceBook:'Preisliste ausfüllen →',project:'Projekt',type:'Typ',status:'Status',currency:'Währung',open:'Öffnen →',statusDraft:'Entwurf',statusActive:'Aktiv',statusQuoted:'Gesendet',statusApproved:'Angenommen',statusEngineering:'Technik',statusProduction:'Produktion',statusInstalled:'Montage',statusCompleted:'Abgeschlossen',statusArchived:'Archiv',search:'Suche',projectName:'Projektname',allStatuses:'Alle Status',find:'Suchen',reset:'Zurücksetzen',allProjectsEyebrow:'ALLE PROJEKTE',found:'gefunden',nothingFound:'Nichts gefunden',noProjectsFilterTitle:'Keine Projekte für diesen Filter',noProjectsFilterText:'Ändern Sie die Suche oder erstellen Sie eine neue Kalkulation.',createQuote:'Kalkulation erstellen',customer:'Kunde',modified:'Geändert',copy:'Kopie',archive:'Archiv',projectArchived:'Projekt wurde archiviert.',createProject:'Projekt erstellen',homeBack:'← Übersicht',basicData:'Grunddaten',furnitureDetailsNext:'Möbeldetails werden im nächsten Schritt hinzugefügt.',projectNameLabel:'Projektname',projectNamePlaceholder:'Zum Beispiel Küche Novak',furnitureType:'Möbeltyp',cancel:'Abbrechen',createAndOpen:'Erstellen und öffnen',furnitureKitchen:'Küche',furnitureWardrobe:'Kleiderschrank',furnitureBuiltIn:'Einbaumöbel',furnitureCabinet:'Einzelner Korpus',furnitureSideboard:'Kommode / Sideboard',furnitureMixed:'Gemischtes Projekt',createProjectError:'Projekt konnte nicht erstellt werden. Prüfen Sie die Daten und versuchen Sie es erneut.',
  },
  pl: {
    appName:'Makster Quote',workspace:'Warsztat',dashboard:'Pulpit',projects:'Projekty',newQuote:'Nowa wycena',quotes:'Oferty',analytics:'Analityka',customers:'Klienci',priceBook:'Cennik',cabinetLibrary:'Biblioteka szafek',hardware:'Okucia',pricingSettings:'Marża i koszty ogólne',documentSettings:'Dokumenty / dane firmy',billing:'Plan i płatności',readiness:'Gotowość systemu',plan:'Plan',signOut:'Wyloguj',interfaceLanguage:'Język interfejsu',documentLanguage:'Język dokumentu',projectSummary:'Podsumowanie projektu',cost:'Koszt',trueCost:'Pełny koszt',sellingPrice:'Cena sprzedaży',profit:'Zysk',margin:'Marża',markup:'Narzut',targetMargin:'Docelowa marża',applyTargetMargin:'Zastosuj docelową marżę',materials:'Materiały',fronts:'Fronty',edges:'Obrzeża',production:'Produkcja',labour:'Robocizna',delivery:'Dostawa',installation:'Montaż',overhead:'Koszty ogólne',clientQuote:'Oferta dla klienta',productionPackage:'Pakiet produkcyjny',addCabinet:'Dodaj szafkę',draft:'Szkic',ready:'Gotowe',sent:'Wysłane',accepted:'Zaakceptowane',rejected:'Odrzucone',metricProjects:'Projekty',metricQuotes:'Oferty',metricCustomers:'Klienci',metricPriceBook:'Cennik',allProjects:'wszystkie projekty →',quotePipeline:'pipeline →',customerBase:'baza klientów →',activePrices:'aktywne ceny →',recentCalculations:'Ostatnie wyceny',noCalculationsTitle:'Brak wycen',noCalculationsText:'Utwórz pierwszy projekt. Makster zapisze go we wspólnej bazie i przygotuje do późniejszego przekazania do Makster Pro.',createFirstQuote:'Utwórz pierwszą wycenę',priceBookEmptyTitle:'Cennik jest pusty.',priceBookEmptyText:'Dopóki nie dodasz własnych cen zakupu, Makster nie będzie wymyślać kosztów.',fillPriceBook:'Uzupełnij cennik →',project:'Projekt',type:'Typ',status:'Status',currency:'Waluta',open:'Otwórz →',statusDraft:'Szkic',statusActive:'Aktywny',statusQuoted:'Wysłano',statusApproved:'Zaakceptowano',statusEngineering:'Technologia',statusProduction:'Produkcja',statusInstalled:'Montaż',statusCompleted:'Zakończony',statusArchived:'Archiwum',search:'Szukaj',projectName:'Nazwa projektu',allStatuses:'Wszystkie statusy',find:'Szukaj',reset:'Wyczyść',allProjectsEyebrow:'WSZYSTKIE PROJEKTY',found:'znaleziono',nothingFound:'Nic nie znaleziono',noProjectsFilterTitle:'Brak projektów dla wybranego filtra',noProjectsFilterText:'Zmień wyszukiwanie albo utwórz nową wycenę.',createQuote:'Utwórz wycenę',customer:'Klient',modified:'Zmieniono',copy:'Kopia',archive:'Archiwum',projectArchived:'Projekt przeniesiono do archiwum.',createProject:'Utwórz projekt',homeBack:'← Pulpit',basicData:'Dane podstawowe',furnitureDetailsNext:'Szczegóły mebli dodasz na następnym ekranie.',projectNameLabel:'Nazwa projektu',projectNamePlaceholder:'Na przykład Kuchnia Novak',furnitureType:'Typ mebla',cancel:'Anuluj',createAndOpen:'Utwórz i otwórz',furnitureKitchen:'Kuchnia',furnitureWardrobe:'Szafa',furnitureBuiltIn:'Meble w zabudowie',furnitureCabinet:'Pojedynczy korpus',furnitureSideboard:'Komoda / szafka',furnitureMixed:'Projekt mieszany',createProjectError:'Nie udało się utworzyć projektu. Sprawdź dane i spróbuj ponownie.',
  },
};

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return OWNER_DEFAULT_LOCALE;
  const base = value.toLowerCase().split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : FALLBACK_LOCALE;
}

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages[FALLBACK_LOCALE][key];
}

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages[FALLBACK_LOCALE];
}
