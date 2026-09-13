import type { Locale } from './i18n';

export type MarketingMessages = {
  nav: {
    aria: string;
    homeAria: string;
    program: string;
    pricing: string;
    faq: string;
    login: string;
    openQuote: string;
    menu: string;
    language: string;
    footer: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    emphasis: string;
    body: string;
    primary: string;
    secondary: string;
    liveProject: string;
    modulesMargin: string;
    overview: string;
    structure: string;
    documents: string;
    cost: string;
    clientPrice: string;
    moduleDoors: string;
    moduleDrawers: string;
    moduleOven: string;
  };
  demo: {
    sectionLabel: string;
    title: string;
    emphasis: string;
    liveDemo: string;
    workshop: string;
    pilot: string;
    projectActive: string;
    clientPdf: string;
    calculation: string;
    proposal: string;
    cabinets: string;
    addModule: string;
    saved: string;
    dimensions: string;
    width: string;
    height: string;
    depth: string;
    construction: string;
    cabinetBody: string;
    front: string;
    drawers: string;
    opening: string;
    engineeringRule: string;
    liveCost: string;
    withoutManual: string;
    purchasePrices: string;
    addItem: string;
    category: string;
    item: string;
    unit: string;
    price: string;
    material: string;
    hardware: string;
    edge: string;
    assembly: string;
    installation: string;
    sheet: string;
    set: string;
    metre: string;
    hour: string;
    activeItems: string;
    priceHint: string;
    commercialProposal: string;
    customKitchen: string;
    bodyAndFronts: string;
    manufacturing: string;
    included: string;
    total: string;
    pdfReady: string;
    versionSaved: string;
    openPdf: string;
    flow: string;
  };
  visual: {
    aria: string;
    eyebrow: string;
    title: string;
    realProject: string;
    nextStep: string;
    production: string;
  };
  story: {
    aria: string;
    eyebrow: string;
    title: string;
    emphasis: string;
    construction: string;
    modules: string;
    cost: string;
    margin: string;
    client: string;
    proposal: string;
    ready: string;
    send: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    emphasis: string;
    note: string;
    pilotBadge: string;
    pilotPrice: string;
    pilotTitle: string;
    pilotDescription: string;
    pilotCta: string;
    founderName: string;
    founderStatus: string;
    founderDescription: string;
    proName: string;
    proStatus: string;
    proDescription: string;
    workshopName: string;
    workshopStatus: string;
    workshopDescription: string;
  };
  faq: {
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  final: {
    title: string;
    body: string;
    cta: string;
  };
};

const messages: Record<Locale, MarketingMessages> = {
  ru: {
    nav: { aria:'Основная навигация',homeAria:'Makster Quote — главная',program:'Программа',pricing:'Тарифы',faq:'FAQ',login:'Войти',openQuote:'Открыть Quote',menu:'Меню',language:'Язык сайта',footer:'Furniture Pricing OS · часть экосистемы Makster Atelier' },
    hero: { eyebrow:'СОФТ ДЛЯ МЕБЕЛЬЩИКОВ И МАСТЕРСКИХ',title:'Смета и маржа — ',emphasis:'прямо из мебельного проекта.',body:'Makster Quote считает конструкцию, себестоимость и цену клиенту по вашим реальным закупочным ценам.',primary:'Открыть Makster Quote',secondary:'Показать программу',liveProject:'LIVE PROJECT',modulesMargin:'8 модулей · 34,8% маржа',overview:'Обзор',structure:'Конструкция',documents:'Документы',cost:'Себестоимость',clientPrice:'Цена клиенту',moduleDoors:'2 фасада · 3 полки',moduleDrawers:'3 × LEGRABOX',moduleOven:'духовой шкаф' },
    demo: { sectionLabel:'MAKSTER QUOTE / ПРОДУКТ',title:'Вот сама ',emphasis:'программа.',liveDemo:'LIVE DEMO',workshop:'МАСТЕРСКАЯ',pilot:'ПИЛОТ',projectActive:'КУХНЯ · АКТИВНЫЙ ПРОЕКТ',clientPdf:'PDF клиента',calculation:'Расчёт',proposal:'Предложение',cabinets:'КОРПУСА',addModule:'+ Добавить модуль',saved:'Сохранено ✓',dimensions:'Габариты',width:'Ширина',height:'Высота',depth:'Глубина',construction:'Конструкция',cabinetBody:'Корпус',front:'Фасад',drawers:'Ящики',opening:'Открывание',engineeringRule:'18 мм · зазоры 2 мм · задняя стенка в паз',liveCost:'LIVE COST',withoutManual:'без ручного пересчёта',purchasePrices:'Закупочные цены мастерской',addItem:'+ Позиция',category:'Категория',item:'Позиция',unit:'Ед.',price:'Цена',material:'Материал',hardware:'Фурнитура',edge:'Кромка',assembly:'Сборка мастерской',installation:'Монтаж на объекте',sheet:'лист',set:'компл.',metre:'м',hour:'ч',activeItems:'активных позиций',priceHint:'Quote считает по вашим ценам',commercialProposal:'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',customKitchen:'Индивидуальная кухня · Прага',bodyAndFronts:'Корпус и фасады',manufacturing:'Изготовление',included:'включено',total:'ИТОГО',pdfReady:'PDF готов',versionSaved:'Версия V3 сохранена',openPdf:'Открыть PDF',flow:'Конструкция → реальные цены → True Cost → цена клиенту.' },
    visual: { aria:'Реальный мебельный контекст Makster Quote',eyebrow:'ОТ СМЕТЫ К РЕАЛЬНОЙ МЕБЕЛИ',title:'Расчёт должен закончиться реальным проектом.',realProject:'РЕАЛЬНЫЙ ПРОЕКТ',nextStep:'СЛЕДУЮЩИЙ ШАГ',production:'Quote → Pro → мастерская' },
    story: { aria:'Makster Quote в действии',eyebrow:'НЕ ЧИТАТЬ. СМОТРЕТЬ.',title:'Проект превращается ',emphasis:'в цену.',construction:'КОНСТРУКЦИЯ',modules:'8 модулей',cost:'СЕБЕСТОИМОСТЬ',margin:'маржа',client:'КЛИЕНТУ',proposal:'Предложение клиенту',ready:'ГОТОВ ✓',send:'Отправить клиенту →' },
    pricing: { eyebrow:'ТАРИФЫ',title:'Сначала проверьте Quote ',emphasis:'на своей работе.',note:'Платная подписка оформляется внутри Makster Quote после входа. До запуска цен из платёжной системы мы не показываем вымышленные суммы.',pilotBadge:'FREE / ЗАКРЫТЫЙ ПИЛОТ',pilotPrice:'0 Kč',pilotTitle:'Посчитайте реальный проект.',pilotDescription:'Quote Builder · Price Book · True Cost · PDF',pilotCta:'Начать пилот',founderName:'Для первых мастерских',founderStatus:'После пилота',founderDescription:'Ранний доступ и расширенные возможности для участников запуска.',proName:'Для мебельщика',proStatus:'На запуске',proDescription:'Регулярные расчёты, коммерческие предложения и история проектов.',workshopName:'Для команды',workshopStatus:'По запросу',workshopDescription:'Роли, общий Price Book и увеличенный объём проектов.' },
    faq: { title:'Вопросы до первого расчёта.',items:[
      {question:'Makster Quote — это замена Excel?',answer:'Да, но не просто более красивый Excel. Quote строит расчёт вокруг реальной мебельной конструкции, Price Book и себестоимости, чтобы коммерческая часть не жила отдельно от проекта.'},
      {question:'Нужно ли сразу заполнять весь прайс-лист?',answer:'Нет. Можно начать с основных материалов и фурнитуры. Если цены нет, Makster показывает это явно, а не подставляет вымышленную стоимость.'},
      {question:'Можно ли использовать Quote без Makster Pro?',answer:'Да. Quote работает как самостоятельный облачный продукт. При этом структура данных сразу готовится к связке с Makster Pro.'},
      {question:'Будет ли мобильная версия?',answer:'Публичный сайт и ключевые сценарии Quote адаптивны. Инженерное редактирование удобнее на большом экране, но просмотр проектов и быстрые действия работают и на телефоне.'},
      {question:'Какие языки доступны?',answer:'Launch Pack: английский как fallback, русский, чешский, немецкий и польский.'},
    ]},
    final: { title:'Следующая смета должна занимать меньше времени — и оставлять больше маржи.',body:'Запустите пилот на реальном проекте и настройте Quote под собственную мастерскую.',cta:'Открыть Makster Quote' },
  },
  en: {
    nav: { aria:'Main navigation',homeAria:'Makster Quote — home',program:'Product',pricing:'Pricing',faq:'FAQ',login:'Sign in',openQuote:'Open Quote',menu:'Menu',language:'Website language',footer:'Furniture Pricing OS · part of the Makster Atelier ecosystem' },
    hero: { eyebrow:'SOFTWARE FOR FURNITURE MAKERS AND WORKSHOPS',title:'Cost and margin — ',emphasis:'straight from the furniture project.',body:'Makster Quote calculates construction, true cost and the customer price using your actual purchase prices.',primary:'Open Makster Quote',secondary:'See the product',liveProject:'LIVE PROJECT',modulesMargin:'8 modules · 34.8% margin',overview:'Overview',structure:'Construction',documents:'Documents',cost:'Cost',clientPrice:'Customer price',moduleDoors:'2 fronts · 3 shelves',moduleDrawers:'3 × LEGRABOX',moduleOven:'built-in oven' },
    demo: { sectionLabel:'MAKSTER QUOTE / PRODUCT',title:'This is the ',emphasis:'actual product.',liveDemo:'LIVE DEMO',workshop:'WORKSHOP',pilot:'PILOT',projectActive:'KITCHEN · ACTIVE',clientPdf:'Customer PDF',calculation:'Calculation',proposal:'Proposal',cabinets:'CABINETS',addModule:'+ Add module',saved:'Saved ✓',dimensions:'Dimensions',width:'Width',height:'Height',depth:'Depth',construction:'Construction',cabinetBody:'Cabinet body',front:'Front',drawers:'Drawers',opening:'Opening',engineeringRule:'18 mm · 2 mm gaps · back panel in groove',liveCost:'LIVE COST',withoutManual:'without manual recalculation',purchasePrices:'Workshop purchase prices',addItem:'+ Item',category:'Category',item:'Item',unit:'Unit',price:'Price',material:'Material',hardware:'Hardware',edge:'Edge band',assembly:'Workshop assembly',installation:'On-site installation',sheet:'sheet',set:'set',metre:'m',hour:'h',activeItems:'active items',priceHint:'Quote calculates with your prices',commercialProposal:'COMMERCIAL PROPOSAL',customKitchen:'Custom kitchen · Prague',bodyAndFronts:'Cabinet body and fronts',manufacturing:'Manufacturing',included:'included',total:'TOTAL',pdfReady:'PDF ready',versionSaved:'Version V3 saved',openPdf:'Open PDF',flow:'Construction → actual prices → True Cost → customer price.' },
    visual: { aria:'Makster Quote in a real furniture workflow',eyebrow:'FROM QUOTE TO REAL FURNITURE',title:'Every calculation should end in a real project.',realProject:'REAL PROJECT',nextStep:'NEXT STEP',production:'Quote → Pro → workshop' },
    story: { aria:'Makster Quote in action',eyebrow:'DON’T READ. WATCH.',title:'A project becomes ',emphasis:'a price.',construction:'CONSTRUCTION',modules:'8 modules',cost:'TRUE COST',margin:'margin',client:'FOR THE CUSTOMER',proposal:'Customer proposal',ready:'READY ✓',send:'Send to customer →' },
    pricing: { eyebrow:'PRICING',title:'First test Quote ',emphasis:'on real work.',note:'Paid subscriptions are purchased inside Makster Quote after sign-in. We do not publish invented amounts before the payment-provider prices are configured.',pilotBadge:'FREE / CLOSED PILOT',pilotPrice:'0 Kč',pilotTitle:'Calculate a real project.',pilotDescription:'Quote Builder · Price Book · True Cost · PDF',pilotCta:'Start the pilot',founderName:'For early workshops',founderStatus:'After the pilot',founderDescription:'Early access and expanded capabilities for launch participants.',proName:'For furniture makers',proStatus:'At launch',proDescription:'Regular calculations, commercial proposals and project history.',workshopName:'For teams',workshopStatus:'Contact us',workshopDescription:'Roles, a shared Price Book and a larger project volume.' },
    faq: { title:'Questions before the first calculation.',items:[
      {question:'Is Makster Quote a replacement for Excel?',answer:'Yes, but it is more than a prettier spreadsheet. Quote connects the commercial calculation to the actual furniture construction, your Price Book and true cost.'},
      {question:'Do I need to fill the entire Price Book first?',answer:'No. Start with your main materials and hardware. When a price is missing, Makster shows it clearly instead of inventing a cost.'},
      {question:'Can I use Quote without Makster Pro?',answer:'Yes. Quote works as a standalone cloud product, while its data structure is ready for future integration with Makster Pro.'},
      {question:'Does it work on mobile?',answer:'The public site and key Quote scenarios are responsive. Engineering work is more comfortable on a larger screen, while project viewing and quick actions work on a phone.'},
      {question:'Which languages are available?',answer:'Launch Pack: English as the fallback, Russian, Czech, German and Polish.'},
    ]},
    final: { title:'Your next quote should take less time — and leave more margin.',body:'Run the pilot on a real project and configure Quote for your own workshop.',cta:'Open Makster Quote' },
  },
  cs: {
    nav: { aria:'Hlavní navigace',homeAria:'Makster Quote — úvod',program:'Program',pricing:'Tarify',faq:'FAQ',login:'Přihlásit se',openQuote:'Otevřít Quote',menu:'Menu',language:'Jazyk webu',footer:'Furniture Pricing OS · součást ekosystému Makster Atelier' },
    hero: { eyebrow:'SOFTWARE PRO TRUHLÁŘE A DÍLNY',title:'Kalkulace a marže — ',emphasis:'přímo z nábytkového projektu.',body:'Makster Quote počítá konstrukci, skutečné náklady a cenu pro zákazníka podle vašich reálných nákupních cen.',primary:'Otevřít Makster Quote',secondary:'Ukázat program',liveProject:'ŽIVÝ PROJEKT',modulesMargin:'8 modulů · marže 34,8 %',overview:'Přehled',structure:'Konstrukce',documents:'Dokumenty',cost:'Náklady',clientPrice:'Cena pro zákazníka',moduleDoors:'2 čela · 3 police',moduleDrawers:'3 × LEGRABOX',moduleOven:'vestavná trouba' },
    demo: { sectionLabel:'MAKSTER QUOTE / PRODUKT',title:'Takhle vypadá ',emphasis:'skutečný program.',liveDemo:'ŽIVÉ DEMO',workshop:'DÍLNA',pilot:'PILOT',projectActive:'KUCHYNĚ · AKTIVNÍ',clientPdf:'PDF pro zákazníka',calculation:'Kalkulace',proposal:'Nabídka',cabinets:'SKŘÍŇKY',addModule:'+ Přidat modul',saved:'Uloženo ✓',dimensions:'Rozměry',width:'Šířka',height:'Výška',depth:'Hloubka',construction:'Konstrukce',cabinetBody:'Korpus',front:'Čelo',drawers:'Zásuvky',opening:'Otevírání',engineeringRule:'18 mm · mezery 2 mm · záda v drážce',liveCost:'ŽIVÉ NÁKLADY',withoutManual:'bez ručního přepočtu',purchasePrices:'Nákupní ceny dílny',addItem:'+ Položka',category:'Kategorie',item:'Položka',unit:'Jedn.',price:'Cena',material:'Materiál',hardware:'Kování',edge:'Hrana',assembly:'Montáž v dílně',installation:'Montáž na místě',sheet:'deska',set:'sada',metre:'m',hour:'h',activeItems:'aktivních položek',priceHint:'Quote počítá podle vašich cen',commercialProposal:'OBCHODNÍ NABÍDKA',customKitchen:'Kuchyně na míru · Praha',bodyAndFronts:'Korpus a čela',manufacturing:'Výroba',included:'zahrnuto',total:'CELKEM',pdfReady:'PDF připraveno',versionSaved:'Verze V3 uložena',openPdf:'Otevřít PDF',flow:'Konstrukce → reálné ceny → True Cost → cena pro zákazníka.' },
    visual: { aria:'Makster Quote v reálném nábytkovém procesu',eyebrow:'OD KALKULACE KE SKUTEČNÉMU NÁBYTKU',title:'Každá kalkulace má skončit reálným projektem.',realProject:'REÁLNÝ PROJEKT',nextStep:'DALŠÍ KROK',production:'Quote → Pro → dílna' },
    story: { aria:'Makster Quote v praxi',eyebrow:'NEČTĚTE. DÍVEJTE SE.',title:'Projekt se mění ',emphasis:'v cenu.',construction:'KONSTRUKCE',modules:'8 modulů',cost:'SKUTEČNÉ NÁKLADY',margin:'marže',client:'PRO ZÁKAZNÍKA',proposal:'Nabídka pro zákazníka',ready:'PŘIPRAVENO ✓',send:'Odeslat zákazníkovi →' },
    pricing: { eyebrow:'TARIFY',title:'Nejdřív vyzkoušejte Quote ',emphasis:'na skutečné zakázce.',note:'Placené předplatné se aktivuje uvnitř Makster Quote po přihlášení. Dokud nejsou nastaveny ceny u platební služby, nezobrazujeme vymyšlené částky.',pilotBadge:'ZDARMA / UZAVŘENÝ PILOT',pilotPrice:'0 Kč',pilotTitle:'Spočítejte skutečný projekt.',pilotDescription:'Quote Builder · Price Book · True Cost · PDF',pilotCta:'Spustit pilot',founderName:'Pro první dílny',founderStatus:'Po pilotu',founderDescription:'Včasný přístup a rozšířené možnosti pro účastníky spuštění.',proName:'Pro truhláře',proStatus:'Při spuštění',proDescription:'Pravidelné kalkulace, obchodní nabídky a historie projektů.',workshopName:'Pro týmy',workshopStatus:'Na dotaz',workshopDescription:'Role, společný ceník a větší objem projektů.' },
    faq: { title:'Otázky před první kalkulací.',items:[
      {question:'Je Makster Quote náhrada za Excel?',answer:'Ano, ale není to jen hezčí tabulka. Quote propojuje obchodní kalkulaci se skutečnou konstrukcí nábytku, ceníkem a reálnými náklady.'},
      {question:'Musím nejprve vyplnit celý ceník?',answer:'Ne. Začněte hlavními materiály a kováním. Když cena chybí, Makster to jasně ukáže místo dosazení vymyšlené částky.'},
      {question:'Mohu používat Quote bez Makster Pro?',answer:'Ano. Quote funguje jako samostatný cloudový produkt a jeho datová struktura je připravena na budoucí propojení s Makster Pro.'},
      {question:'Funguje na mobilu?',answer:'Veřejný web a klíčové scénáře Quote jsou responzivní. Technická práce je pohodlnější na větší obrazovce, prohlížení projektů a rychlé akce fungují i na telefonu.'},
      {question:'Které jazyky jsou dostupné?',answer:'Launch Pack: angličtina jako záložní jazyk, ruština, čeština, němčina a polština.'},
    ]},
    final: { title:'Další kalkulace má zabrat méně času — a ponechat vyšší marži.',body:'Spusťte pilot na skutečném projektu a nastavte Quote pro vlastní dílnu.',cta:'Otevřít Makster Quote' },
  },
  de: {
    nav: { aria:'Hauptnavigation',homeAria:'Makster Quote — Startseite',program:'Produkt',pricing:'Tarife',faq:'FAQ',login:'Anmelden',openQuote:'Quote öffnen',menu:'Menü',language:'Webseitensprache',footer:'Furniture Pricing OS · Teil des Makster-Atelier-Ökosystems' },
    hero: { eyebrow:'SOFTWARE FÜR MÖBELBAUER UND WERKSTÄTTEN',title:'Kalkulation und Marge — ',emphasis:'direkt aus dem Möbelprojekt.',body:'Makster Quote berechnet Konstruktion, Vollkosten und Kundenpreis anhand Ihrer tatsächlichen Einkaufspreise.',primary:'Makster Quote öffnen',secondary:'Produkt ansehen',liveProject:'LIVE-PROJEKT',modulesMargin:'8 Module · 34,8 % Marge',overview:'Übersicht',structure:'Konstruktion',documents:'Dokumente',cost:'Kosten',clientPrice:'Kundenpreis',moduleDoors:'2 Fronten · 3 Böden',moduleDrawers:'3 × LEGRABOX',moduleOven:'Einbaubackofen' },
    demo: { sectionLabel:'MAKSTER QUOTE / PRODUKT',title:'Das ist das ',emphasis:'echte Produkt.',liveDemo:'LIVE-DEMO',workshop:'WERKSTATT',pilot:'PILOT',projectActive:'KÜCHE · AKTIV',clientPdf:'Kunden-PDF',calculation:'Kalkulation',proposal:'Angebot',cabinets:'KORPUSSE',addModule:'+ Modul hinzufügen',saved:'Gespeichert ✓',dimensions:'Abmessungen',width:'Breite',height:'Höhe',depth:'Tiefe',construction:'Konstruktion',cabinetBody:'Korpus',front:'Front',drawers:'Schubladen',opening:'Öffnung',engineeringRule:'18 mm · 2 mm Fugen · Rückwand in Nut',liveCost:'LIVE-KOSTEN',withoutManual:'ohne manuelle Neuberechnung',purchasePrices:'Einkaufspreise der Werkstatt',addItem:'+ Position',category:'Kategorie',item:'Position',unit:'Einheit',price:'Preis',material:'Material',hardware:'Beschläge',edge:'Kante',assembly:'Werkstattmontage',installation:'Montage vor Ort',sheet:'Platte',set:'Set',metre:'m',hour:'Std.',activeItems:'aktive Positionen',priceHint:'Quote rechnet mit Ihren Preisen',commercialProposal:'KUNDENANGEBOT',customKitchen:'Individuelle Küche · Prag',bodyAndFronts:'Korpus und Fronten',manufacturing:'Fertigung',included:'enthalten',total:'GESAMT',pdfReady:'PDF bereit',versionSaved:'Version V3 gespeichert',openPdf:'PDF öffnen',flow:'Konstruktion → reale Preise → True Cost → Kundenpreis.' },
    visual: { aria:'Makster Quote im realen Möbelprozess',eyebrow:'VON DER KALKULATION ZUM ECHTEN MÖBEL',title:'Jede Kalkulation soll in einem realen Projekt enden.',realProject:'REALES PROJEKT',nextStep:'NÄCHSTER SCHRITT',production:'Quote → Pro → Werkstatt' },
    story: { aria:'Makster Quote im Einsatz',eyebrow:'NICHT LESEN. ANSEHEN.',title:'Ein Projekt wird ',emphasis:'zum Preis.',construction:'KONSTRUKTION',modules:'8 Module',cost:'VOLLKOSTEN',margin:'Marge',client:'FÜR DEN KUNDEN',proposal:'Kundenangebot',ready:'BEREIT ✓',send:'An Kunden senden →' },
    pricing: { eyebrow:'TARIFE',title:'Testen Sie Quote zuerst ',emphasis:'an einem echten Auftrag.',note:'Bezahlte Abonnements werden nach der Anmeldung in Makster Quote abgeschlossen. Bevor die Preise beim Zahlungsanbieter eingerichtet sind, zeigen wir keine erfundenen Beträge.',pilotBadge:'KOSTENLOS / GESCHLOSSENER PILOT',pilotPrice:'0 Kč',pilotTitle:'Kalkulieren Sie ein reales Projekt.',pilotDescription:'Quote Builder · Price Book · True Cost · PDF',pilotCta:'Pilot starten',founderName:'Für erste Werkstätten',founderStatus:'Nach dem Pilot',founderDescription:'Früher Zugang und erweiterte Funktionen für Teilnehmer des Starts.',proName:'Für Möbelbauer',proStatus:'Zum Start',proDescription:'Regelmäßige Kalkulationen, Kundenangebote und Projekthistorie.',workshopName:'Für Teams',workshopStatus:'Auf Anfrage',workshopDescription:'Rollen, gemeinsame Preisliste und größeres Projektvolumen.' },
    faq: { title:'Fragen vor der ersten Kalkulation.',items:[
      {question:'Ersetzt Makster Quote Excel?',answer:'Ja, aber es ist mehr als eine schönere Tabelle. Quote verbindet die kaufmännische Kalkulation mit der tatsächlichen Möbelkonstruktion, Ihrer Preisliste und den Vollkosten.'},
      {question:'Muss ich zuerst die ganze Preisliste ausfüllen?',answer:'Nein. Beginnen Sie mit den wichtigsten Materialien und Beschlägen. Fehlt ein Preis, zeigt Makster das klar an, statt Kosten zu erfinden.'},
      {question:'Kann ich Quote ohne Makster Pro verwenden?',answer:'Ja. Quote funktioniert eigenständig in der Cloud und seine Datenstruktur ist für die spätere Verbindung mit Makster Pro vorbereitet.'},
      {question:'Funktioniert es mobil?',answer:'Die öffentliche Website und wichtige Quote-Abläufe sind responsiv. Technische Bearbeitung ist auf einem großen Bildschirm angenehmer, Projektansicht und schnelle Aktionen funktionieren auch mobil.'},
      {question:'Welche Sprachen sind verfügbar?',answer:'Launch Pack: Englisch als Fallback sowie Russisch, Tschechisch, Deutsch und Polnisch.'},
    ]},
    final: { title:'Die nächste Kalkulation soll weniger Zeit kosten — und mehr Marge lassen.',body:'Starten Sie den Pilot mit einem realen Projekt und richten Sie Quote für Ihre Werkstatt ein.',cta:'Makster Quote öffnen' },
  },
  pl: {
    nav: { aria:'Główna nawigacja',homeAria:'Makster Quote — strona główna',program:'Program',pricing:'Cennik',faq:'FAQ',login:'Zaloguj się',openQuote:'Otwórz Quote',menu:'Menu',language:'Język strony',footer:'Furniture Pricing OS · część ekosystemu Makster Atelier' },
    hero: { eyebrow:'OPROGRAMOWANIE DLA STOLARZY I WARSZTATÓW',title:'Kosztorys i marża — ',emphasis:'prosto z projektu mebla.',body:'Makster Quote oblicza konstrukcję, pełny koszt i cenę dla klienta na podstawie rzeczywistych cen zakupu.',primary:'Otwórz Makster Quote',secondary:'Pokaż program',liveProject:'AKTYWNY PROJEKT',modulesMargin:'8 modułów · marża 34,8%',overview:'Przegląd',structure:'Konstrukcja',documents:'Dokumenty',cost:'Koszt',clientPrice:'Cena dla klienta',moduleDoors:'2 fronty · 3 półki',moduleDrawers:'3 × LEGRABOX',moduleOven:'piekarnik do zabudowy' },
    demo: { sectionLabel:'MAKSTER QUOTE / PRODUKT',title:'Tak wygląda ',emphasis:'prawdziwy program.',liveDemo:'DEMO NA ŻYWO',workshop:'WARSZTAT',pilot:'PILOT',projectActive:'KUCHNIA · AKTYWNY',clientPdf:'PDF dla klienta',calculation:'Kalkulacja',proposal:'Oferta',cabinets:'KORPUSY',addModule:'+ Dodaj moduł',saved:'Zapisano ✓',dimensions:'Wymiary',width:'Szerokość',height:'Wysokość',depth:'Głębokość',construction:'Konstrukcja',cabinetBody:'Korpus',front:'Front',drawers:'Szuflady',opening:'Otwieranie',engineeringRule:'18 mm · szczeliny 2 mm · plecy we wpust',liveCost:'KOSZT NA ŻYWO',withoutManual:'bez ręcznego przeliczania',purchasePrices:'Ceny zakupu warsztatu',addItem:'+ Pozycja',category:'Kategoria',item:'Pozycja',unit:'Jedn.',price:'Cena',material:'Materiał',hardware:'Okucia',edge:'Obrzeże',assembly:'Montaż w warsztacie',installation:'Montaż na miejscu',sheet:'płyta',set:'kpl.',metre:'m',hour:'godz.',activeItems:'aktywnych pozycji',priceHint:'Quote liczy według Twoich cen',commercialProposal:'OFERTA HANDLOWA',customKitchen:'Kuchnia na wymiar · Praga',bodyAndFronts:'Korpus i fronty',manufacturing:'Produkcja',included:'w cenie',total:'RAZEM',pdfReady:'PDF gotowy',versionSaved:'Wersja V3 zapisana',openPdf:'Otwórz PDF',flow:'Konstrukcja → rzeczywiste ceny → True Cost → cena dla klienta.' },
    visual: { aria:'Makster Quote w rzeczywistym procesie meblowym',eyebrow:'OD WYCENY DO PRAWDZIWYCH MEBLI',title:'Każda kalkulacja powinna zakończyć się realnym projektem.',realProject:'PRAWDZIWY PROJEKT',nextStep:'NASTĘPNY KROK',production:'Quote → Pro → warsztat' },
    story: { aria:'Makster Quote w działaniu',eyebrow:'NIE CZYTAJ. ZOBACZ.',title:'Projekt zmienia się ',emphasis:'w cenę.',construction:'KONSTRUKCJA',modules:'8 modułów',cost:'PEŁNY KOSZT',margin:'marża',client:'DLA KLIENTA',proposal:'Oferta dla klienta',ready:'GOTOWE ✓',send:'Wyślij klientowi →' },
    pricing: { eyebrow:'CENNIK',title:'Najpierw sprawdź Quote ',emphasis:'na prawdziwym zleceniu.',note:'Płatną subskrypcję aktywuje się wewnątrz Makster Quote po zalogowaniu. Dopóki ceny nie są skonfigurowane u operatora płatności, nie pokazujemy wymyślonych kwot.',pilotBadge:'BEZPŁATNIE / ZAMKNIĘTY PILOT',pilotPrice:'0 Kč',pilotTitle:'Policz prawdziwy projekt.',pilotDescription:'Quote Builder · Price Book · True Cost · PDF',pilotCta:'Rozpocznij pilot',founderName:'Dla pierwszych warsztatów',founderStatus:'Po pilocie',founderDescription:'Wczesny dostęp i rozszerzone funkcje dla uczestników startu.',proName:'Dla stolarza',proStatus:'Przy starcie',proDescription:'Regularne kalkulacje, oferty handlowe i historia projektów.',workshopName:'Dla zespołu',workshopStatus:'Na zapytanie',workshopDescription:'Role, wspólny cennik i większa liczba projektów.' },
    faq: { title:'Pytania przed pierwszą kalkulacją.',items:[
      {question:'Czy Makster Quote zastępuje Excel?',answer:'Tak, ale to coś więcej niż ładniejszy arkusz. Quote łączy kalkulację handlową z rzeczywistą konstrukcją mebla, Twoim cennikiem i pełnym kosztem.'},
      {question:'Czy muszę najpierw wypełnić cały cennik?',answer:'Nie. Zacznij od podstawowych materiałów i okuć. Gdy brakuje ceny, Makster pokazuje to jasno zamiast wymyślać koszt.'},
      {question:'Czy mogę używać Quote bez Makster Pro?',answer:'Tak. Quote działa jako samodzielny produkt w chmurze, a jego struktura danych jest gotowa do przyszłego połączenia z Makster Pro.'},
      {question:'Czy działa na telefonie?',answer:'Publiczna strona i kluczowe scenariusze Quote są responsywne. Praca techniczna jest wygodniejsza na większym ekranie, ale przegląd projektów i szybkie działania działają także na telefonie.'},
      {question:'Jakie języki są dostępne?',answer:'Launch Pack: angielski jako fallback oraz rosyjski, czeski, niemiecki i polski.'},
    ]},
    final: { title:'Następna wycena powinna zająć mniej czasu — i zostawić większą marżę.',body:'Uruchom pilota na prawdziwym projekcie i skonfiguruj Quote dla własnego warsztatu.',cta:'Otwórz Makster Quote' },
  },
};

export function getMarketingMessages(locale: Locale): MarketingMessages {
  return messages[locale] ?? messages.en;
}
