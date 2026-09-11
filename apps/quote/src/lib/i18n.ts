export const SUPPORTED_LOCALES = ['ru', 'en', 'cs', 'de', 'pl'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const OWNER_DEFAULT_LOCALE: Locale = 'ru';
export const FALLBACK_LOCALE: Locale = 'en';

const messages = {
  ru: {
    appName: 'Makster Quote',
    dashboard: 'Главная',
    projects: 'Проекты',
    priceBook: 'Прайс-лист',
    cabinetLibrary: 'Библиотека модулей',
    hardware: 'Фурнитура',
    customers: 'Клиенты',
    documents: 'Документы',
    settings: 'Настройки',
    newQuote: 'Новый расчёт',
    addCabinet: 'Добавить модуль',
    projectSummary: 'Итог по проекту',
    cost: 'Себестоимость',
    trueCost: 'Полная себестоимость',
    sellingPrice: 'Цена продажи',
    profit: 'Прибыль',
    margin: 'Маржа',
    markup: 'Наценка',
    targetMargin: 'Целевая маржа',
    applyTargetMargin: 'Применить целевую маржу',
    materials: 'Материалы',
    fronts: 'Фасады',
    edges: 'Кромка',
    production: 'Производство',
    labour: 'Работа',
    delivery: 'Доставка',
    installation: 'Монтаж',
    overhead: 'Накладные расходы',
    clientQuote: 'Предложение клиенту',
    productionPackage: 'Производственный пакет',
    interfaceLanguage: 'Язык интерфейса',
    documentLanguage: 'Язык документа',
    draft: 'Черновик',
    ready: 'Готов',
    sent: 'Отправлен',
    accepted: 'Принят',
    rejected: 'Отклонён',
  },
  en: {
    appName: 'Makster Quote', dashboard: 'Dashboard', projects: 'Projects', priceBook: 'Price Book', cabinetLibrary: 'Cabinet Library', hardware: 'Hardware', customers: 'Customers', documents: 'Documents', settings: 'Settings', newQuote: 'New Quote', addCabinet: 'Add Cabinet', projectSummary: 'Project Summary', cost: 'Cost', trueCost: 'True Cost', sellingPrice: 'Selling Price', profit: 'Profit', margin: 'Margin', markup: 'Markup', targetMargin: 'Target Margin', applyTargetMargin: 'Apply Target Margin', materials: 'Materials', fronts: 'Fronts', edges: 'Edges', production: 'Production', labour: 'Labour', delivery: 'Delivery', installation: 'Installation', overhead: 'Overhead', clientQuote: 'Client Quote', productionPackage: 'Production Package', interfaceLanguage: 'Interface Language', documentLanguage: 'Document Language', draft: 'Draft', ready: 'Ready', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected',
  },
  cs: {
    appName: 'Makster Quote', dashboard: 'Přehled', projects: 'Projekty', priceBook: 'Ceník', cabinetLibrary: 'Knihovna skříněk', hardware: 'Kování', customers: 'Zákazníci', documents: 'Dokumenty', settings: 'Nastavení', newQuote: 'Nová kalkulace', addCabinet: 'Přidat skříňku', projectSummary: 'Souhrn projektu', cost: 'Náklady', trueCost: 'Skutečné náklady', sellingPrice: 'Prodejní cena', profit: 'Zisk', margin: 'Marže', markup: 'Přirážka', targetMargin: 'Cílová marže', applyTargetMargin: 'Použít cílovou marži', materials: 'Materiály', fronts: 'Čela', edges: 'Hrany', production: 'Výroba', labour: 'Práce', delivery: 'Doprava', installation: 'Montáž', overhead: 'Režie', clientQuote: 'Nabídka zákazníkovi', productionPackage: 'Výrobní podklady', interfaceLanguage: 'Jazyk rozhraní', documentLanguage: 'Jazyk dokumentu', draft: 'Koncept', ready: 'Připraveno', sent: 'Odesláno', accepted: 'Přijato', rejected: 'Odmítnuto',
  },
  de: {
    appName: 'Makster Quote', dashboard: 'Übersicht', projects: 'Projekte', priceBook: 'Preisliste', cabinetLibrary: 'Schrankbibliothek', hardware: 'Beschläge', customers: 'Kunden', documents: 'Dokumente', settings: 'Einstellungen', newQuote: 'Neue Kalkulation', addCabinet: 'Schrank hinzufügen', projectSummary: 'Projektübersicht', cost: 'Kosten', trueCost: 'Vollkosten', sellingPrice: 'Verkaufspreis', profit: 'Gewinn', margin: 'Marge', markup: 'Aufschlag', targetMargin: 'Zielmarge', applyTargetMargin: 'Zielmarge anwenden', materials: 'Materialien', fronts: 'Fronten', edges: 'Kanten', production: 'Produktion', labour: 'Arbeit', delivery: 'Lieferung', installation: 'Montage', overhead: 'Gemeinkosten', clientQuote: 'Kundenangebot', productionPackage: 'Produktionsunterlagen', interfaceLanguage: 'Sprache der Oberfläche', documentLanguage: 'Dokumentsprache', draft: 'Entwurf', ready: 'Bereit', sent: 'Gesendet', accepted: 'Angenommen', rejected: 'Abgelehnt',
  },
  pl: {
    appName: 'Makster Quote', dashboard: 'Pulpit', projects: 'Projekty', priceBook: 'Cennik', cabinetLibrary: 'Biblioteka szafek', hardware: 'Okucia', customers: 'Klienci', documents: 'Dokumenty', settings: 'Ustawienia', newQuote: 'Nowa wycena', addCabinet: 'Dodaj szafkę', projectSummary: 'Podsumowanie projektu', cost: 'Koszt', trueCost: 'Pełny koszt', sellingPrice: 'Cena sprzedaży', profit: 'Zysk', margin: 'Marża', markup: 'Narzut', targetMargin: 'Docelowa marża', applyTargetMargin: 'Zastosuj docelową marżę', materials: 'Materiały', fronts: 'Fronty', edges: 'Obrzeża', production: 'Produkcja', labour: 'Robocizna', delivery: 'Dostawa', installation: 'Montaż', overhead: 'Koszty ogólne', clientQuote: 'Oferta dla klienta', productionPackage: 'Pakiet produkcyjny', interfaceLanguage: 'Język interfejsu', documentLanguage: 'Język dokumentu', draft: 'Szkic', ready: 'Gotowe', sent: 'Wysłane', accepted: 'Zaakceptowane', rejected: 'Odrzucone',
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return OWNER_DEFAULT_LOCALE;
  const base = value.toLowerCase().split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as Locale)
    : FALLBACK_LOCALE;
}

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale]?.[key] ?? messages[FALLBACK_LOCALE][key];
}

export function getMessages(locale: Locale) {
  return messages[locale] ?? messages[FALLBACK_LOCALE];
}
