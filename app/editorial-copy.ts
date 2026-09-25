import type { Lang } from "./content";

export type ExactEditorialCopy = {
  servicesIntro: string;
  servicesBody: string;
  serviceTags: string[][];
  learnMore: string;
  routeTitle: string;
  routeCta: string;
  craftKicker: string;
  craftTitle: string;
  craftBody: string;
  contactKicker: string;
  contactTitle: string;
  processIntro: string;
  processBody: string;
  processRule: string;
  materialsIntro: string;
  materialsBody: string;
  materialCtas: string[];
  criteriaTitle: string;
  criteria: [string, string][];
  materialContextKicker: string;
  materialContextTitle: string;
  materialContextBody: string;
  plannerMaterialsTitle: string;
  plannerMaterialsBody: string;
  projectsIntro: string;
  allProjects: string;
  nextProjectTitle: string;
  aboutDirect: string;
  aboutTeamBody: string;
  responsibilityTitle: string;
  responsibilityBody: string;
  responsibilitySteps: [string, string][];
  realityKicker: string;
  realityTitle: string;
  realityBody: string;
  contactDirectKicker: string;
  contactDirectTitle: string;
  contactDirectCta: string;
  formKicker: string;
  projectTypeLabel: string;
  locationLabel: string;
  projectTypes: string[];
  attachments: string;
  privacy: string;
};

export const exactEditorialCopy: Record<Lang, ExactEditorialCopy> = {
  cs: {
    servicesIntro: "Naše služby.", servicesBody: "Od prvního návrhu po přesnou montáž.",
    serviceTags: [["Dispozice a ergonomie", "Materiály a kování", "Výroba a montáž"], ["Na míru prostoru", "Vnitřní uspořádání", "Přesné napojení"], ["Funkční členění", "Materiálové kombinace", "Čisté linie"], ["Návaznost prvků", "Technická příprava", "Společná realizace"]],
    learnMore: "Zjistit více", routeTitle: "Od návrhu k realizaci.", routeCta: "Jak pracujeme",
    craftKicker: "OD NÁVRHU K REALIZACI", craftTitle: "Poctivé materiály. Výjimečné výsledky.", craftBody: "Spojujeme přírodní materiály, přesné zpracování a nadčasový design.",
    contactKicker: "VÁŠ PROJEKT", contactTitle: "Začněme prostorem, který bude váš.",
    processIntro: "Jeden tým. Jeden návazný proces.", processBody: "Každý krok má jasný výstup, odpovědnost a odsouhlasení.", processRule: "Bez odsouhlasení nepřecházíme do další etapy.",
    materialsIntro: "Materiálové kategorie.", materialsBody: "Každou volbu posuzujeme v kontextu celého projektu.",
    materialCtas: ["Prozkoumat povrchy", "Prozkoumat desky", "Prozkoumat kování", "Prozkoumat detaily"],
    criteriaTitle: "Jak materiály vybíráme.", criteria: [["Vzhled", "Barva, struktura a návaznost"], ["Odolnost", "Zatížení a způsob používání"], ["Údržba", "Čištění a každodenní péče"], ["Rozpočet", "Poměr řešení a celkové hodnoty"]],
    materialContextKicker: "ŘEMESLO V KAŽDÉM DETAILU", materialContextTitle: "Materiál není dekorace. Je součást konstrukce.", materialContextBody: "Spojujeme estetiku, funkčnost a dlouhou životnost, aby nábytek dával smysl dnes i za roky.",
    plannerMaterialsTitle: "Vyberte materiály přímo v návrhu.", plannerMaterialsBody: "Porovnejte povrchy v 3D a sledujte, jak ovlivní vzhled i orientační cenu kuchyně.",
    projectsIntro: "Vybrané realizace.", allProjects: "Vše", nextProjectTitle: "Další realizace může být vaše.",
    aboutDirect: "Klient jedná přímo s lidmi, kteří za výsledek odpovídají.", aboutTeamBody: "Od návrhu přes výrobu až po montáž.",
    responsibilityTitle: "Jedna odpovědnost.", responsibilityBody: "Každý projekt vedeme jako jeden celek — bez ztráty informací mezi etapami.", responsibilitySteps: [["Návrh", "Prostor, potřeby a řešení"], ["Technická příprava", "Konstrukce a materiály"], ["Výroba", "Přesné zpracování"], ["Doprava a montáž", "Dokončení v reálném prostoru"]],
    realityKicker: "PRAHA · ČESKÁ REPUBLIKA", realityTitle: "Od návrhu po realizaci v reálných prostorech.", realityBody: "Navrhujeme, technicky připravujeme, vyrábíme a montujeme nábytek na míru.",
    contactDirectKicker: "RADĚJI OSOBNĚ?", contactDirectTitle: "Ozvěte se přímo. Bez formuláře.", contactDirectCta: "Napsat přes WhatsApp",
    formKicker: "NEZÁVAZNÁ POPTÁVKA", projectTypeLabel: "Typ projektu", locationLabel: "MÍSTO", projectTypes: ["Kuchyně", "Vestavěné skříně", "Kompletní interiér"], attachments: "Podklady k projektu", privacy: "Vaše podklady použijeme pouze pro posouzení projektu.",
  },
  ru: {
    servicesIntro: "Наши услуги.", servicesBody: "От первого проекта до точного монтажа.",
    serviceTags: [["Планировка и эргономика", "Материалы и фурнитура", "Производство и монтаж"], ["Точно по пространству", "Внутреннее наполнение", "Точные примыкания"], ["Функциональное деление", "Сочетания материалов", "Чистые линии"], ["Связь всех элементов", "Техническая подготовка", "Единая реализация"]],
    learnMore: "Узнать больше", routeTitle: "От проекта к реализации.", routeCta: "Как мы работаем",
    craftKicker: "ОТ ПРОЕКТА К РЕАЛИЗАЦИИ", craftTitle: "Честные материалы. Исключительный результат.", craftBody: "Соединяем натуральные материалы, точную обработку и вневременной дизайн.",
    contactKicker: "ВАШ ПРОЕКТ", contactTitle: "Начнём с пространства, которое станет вашим.",
    processIntro: "Одна команда. Единый процесс.", processBody: "У каждого этапа есть понятный результат, ответственность и согласование.", processRule: "Без согласования не переходим к следующему этапу.",
    materialsIntro: "Категории материалов.", materialsBody: "Каждый выбор рассматриваем в контексте всего проекта.",
    materialCtas: ["Посмотреть поверхности", "Посмотреть столешницы", "Посмотреть фурнитуру", "Посмотреть детали"],
    criteriaTitle: "Как мы выбираем материалы.", criteria: [["Внешний вид", "Цвет, структура и сочетания"], ["Стойкость", "Нагрузка и способ использования"], ["Уход", "Чистка и ежедневная эксплуатация"], ["Бюджет", "Баланс решения и общей ценности"]],
    materialContextKicker: "МАСТЕРСТВО В КАЖДОЙ ДЕТАЛИ", materialContextTitle: "Материал — не декорация. Это часть конструкции.", materialContextBody: "Соединяем эстетику, функциональность и долговечность, чтобы мебель служила сегодня и спустя годы.",
    plannerMaterialsTitle: "Выбирайте материалы прямо в проекте.", plannerMaterialsBody: "Сравнивайте поверхности в 3D и смотрите, как они влияют на вид и ориентировочную стоимость кухни.",
    projectsIntro: "Избранные реализации.", allProjects: "Все", nextProjectTitle: "Следующей реализацией может стать ваша.",
    aboutDirect: "Клиент общается напрямую с людьми, которые отвечают за результат.", aboutTeamBody: "От проекта и производства до монтажа.",
    responsibilityTitle: "Единая ответственность.", responsibilityBody: "Каждый проект ведём как единое целое — без потери информации между этапами.", responsibilitySteps: [["Проект", "Пространство, задачи и решение"], ["Техническая подготовка", "Конструкции и материалы"], ["Производство", "Точная обработка"], ["Доставка и монтаж", "Завершение в реальном пространстве"]],
    realityKicker: "ПРАГА · ЧЕШСКАЯ РЕСПУБЛИКА", realityTitle: "От проекта до реализации в реальном пространстве.", realityBody: "Проектируем, технически подготавливаем, производим и монтируем мебель на заказ.",
    contactDirectKicker: "УДОБНЕЕ ЛИЧНО?", contactDirectTitle: "Свяжитесь напрямую. Без формы.", contactDirectCta: "Написать в WhatsApp",
    formKicker: "ЗАЯВКА БЕЗ ОБЯЗАТЕЛЬСТВ", projectTypeLabel: "Тип проекта", locationLabel: "МЕСТО", projectTypes: ["Кухня", "Встроенные шкафы", "Комплексный интерьер"], attachments: "Материалы проекта", privacy: "Ваши материалы используются только для оценки проекта.",
  },
  ua: {
    servicesIntro: "Наші послуги.", servicesBody: "Від першого проєкту до точного монтажу.",
    serviceTags: [["Планування та ергономіка", "Матеріали й фурнітура", "Виробництво та монтаж"], ["Точно під простір", "Внутрішнє наповнення", "Точні примикання"], ["Функціональний поділ", "Поєднання матеріалів", "Чисті лінії"], ["Зв’язок усіх елементів", "Технічна підготовка", "Єдина реалізація"]],
    learnMore: "Дізнатися більше", routeTitle: "Від проєкту до реалізації.", routeCta: "Як ми працюємо",
    craftKicker: "ВІД ПРОЄКТУ ДО РЕАЛІЗАЦІЇ", craftTitle: "Чесні матеріали. Винятковий результат.", craftBody: "Поєднуємо природні матеріали, точне опрацювання та позачасовий дизайн.",
    contactKicker: "ВАШ ПРОЄКТ", contactTitle: "Почнімо з простору, який стане вашим.",
    processIntro: "Одна команда. Єдиний процес.", processBody: "Кожен етап має зрозумілий результат, відповідальність і погодження.", processRule: "Без погодження не переходимо до наступного етапу.",
    materialsIntro: "Категорії матеріалів.", materialsBody: "Кожен вибір розглядаємо в контексті всього проєкту.",
    materialCtas: ["Переглянути поверхні", "Переглянути стільниці", "Переглянути фурнітуру", "Переглянути деталі"],
    criteriaTitle: "Як ми обираємо матеріали.", criteria: [["Вигляд", "Колір, структура та поєднання"], ["Стійкість", "Навантаження та спосіб використання"], ["Догляд", "Чищення та щоденна експлуатація"], ["Бюджет", "Баланс рішення та загальної цінності"]],
    materialContextKicker: "МАЙСТЕРНІСТЬ У КОЖНІЙ ДЕТАЛІ", materialContextTitle: "Матеріал — не декорація. Це частина конструкції.", materialContextBody: "Поєднуємо естетику, функціональність і довговічність, щоб меблі служили сьогодні та через роки.",
    plannerMaterialsTitle: "Обирайте матеріали безпосередньо в проєкті.", plannerMaterialsBody: "Порівнюйте поверхні в 3D і дивіться, як вони впливають на вигляд та орієнтовну вартість кухні.",
    projectsIntro: "Обрані реалізації.", allProjects: "Усі", nextProjectTitle: "Наступною реалізацією може стати ваша.",
    aboutDirect: "Клієнт спілкується безпосередньо з людьми, які відповідають за результат.", aboutTeamBody: "Від проєкту й виробництва до монтажу.",
    responsibilityTitle: "Єдина відповідальність.", responsibilityBody: "Кожен проєкт ведемо як єдине ціле — без втрати інформації між етапами.", responsibilitySteps: [["Проєкт", "Простір, потреби та рішення"], ["Технічна підготовка", "Конструкції та матеріали"], ["Виробництво", "Точне опрацювання"], ["Доставка та монтаж", "Завершення в реальному просторі"]],
    realityKicker: "ПРАГА · ЧЕСЬКА РЕСПУБЛІКА", realityTitle: "Від проєкту до реалізації в реальному просторі.", realityBody: "Проєктуємо, технічно готуємо, виробляємо та монтуємо меблі на замовлення.",
    contactDirectKicker: "ЗРУЧНІШЕ ОСОБИСТО?", contactDirectTitle: "Зв’яжіться напряму. Без форми.", contactDirectCta: "Написати у WhatsApp",
    formKicker: "ЗАПИТ БЕЗ ЗОБОВ’ЯЗАНЬ", projectTypeLabel: "Тип проєкту", locationLabel: "МІСЦЕ", projectTypes: ["Кухня", "Вбудовані шафи", "Комплексний інтер’єр"], attachments: "Матеріали проєкту", privacy: "Ваші матеріали використовуємо лише для оцінки проєкту.",
  },
  en: {
    servicesIntro: "Our services.", servicesBody: "From the first design to precise installation.",
    serviceTags: [["Layout and ergonomics", "Materials and hardware", "Production and installation"], ["Tailored to the space", "Interior organisation", "Precise junctions"], ["Functional zoning", "Material combinations", "Clean lines"], ["Connected elements", "Technical preparation", "One coordinated delivery"]],
    learnMore: "Discover more", routeTitle: "From design to delivery.", routeCta: "How we work",
    craftKicker: "FROM DESIGN TO DELIVERY", craftTitle: "Honest materials. Exceptional results.", craftBody: "We combine natural materials, precise workmanship and timeless design.",
    contactKicker: "YOUR PROJECT", contactTitle: "Let’s begin with a space that becomes yours.",
    processIntro: "One team. One connected process.", processBody: "Every stage has a clear result, owner and approval.", processRule: "We never move to the next stage without your approval.",
    materialsIntro: "Material categories.", materialsBody: "Every choice is considered in the context of the entire project.",
    materialCtas: ["Explore finishes", "Explore worktops", "Explore hardware", "Explore details"],
    criteriaTitle: "How we select materials.", criteria: [["Appearance", "Colour, structure and continuity"], ["Durability", "Load and use pattern"], ["Maintenance", "Cleaning and daily care"], ["Budget", "Balance of solution and overall value"]],
    materialContextKicker: "CRAFT IN EVERY DETAIL", materialContextTitle: "Material is not decoration. It is part of the construction.", materialContextBody: "We combine aesthetics, function and longevity so furniture makes sense today and years from now.",
    plannerMaterialsTitle: "Choose materials directly in the design.", plannerMaterialsBody: "Compare finishes in 3D and see how they affect the look and indicative kitchen price.",
    projectsIntro: "Selected projects.", allProjects: "All", nextProjectTitle: "Your space could be our next project.",
    aboutDirect: "Clients work directly with the people responsible for the outcome.", aboutTeamBody: "From design and production through installation.",
    responsibilityTitle: "One responsibility.", responsibilityBody: "We manage every project as one whole, without losing information between stages.", responsibilitySteps: [["Design", "Space, needs and solution"], ["Technical preparation", "Construction and materials"], ["Production", "Precise workmanship"], ["Delivery and installation", "Completion in the real space"]],
    realityKicker: "PRAGUE · CZECH REPUBLIC", realityTitle: "From design to completion in real spaces.", realityBody: "We design, technically prepare, manufacture and install bespoke furniture.",
    contactDirectKicker: "PREFER TO TALK?", contactDirectTitle: "Contact us directly. No form.", contactDirectCta: "Write on WhatsApp",
    formKicker: "NO-OBLIGATION ENQUIRY", projectTypeLabel: "Project type", locationLabel: "PLACE", projectTypes: ["Kitchen", "Built-in wardrobes", "Complete interior"], attachments: "Project files", privacy: "Your files are used only to assess the project.",
  },
  pl: {
    servicesIntro: "Nasze usługi.", servicesBody: "Od pierwszego projektu po precyzyjny montaż.",
    serviceTags: [["Układ i ergonomia", "Materiały i okucia", "Produkcja i montaż"], ["Na wymiar przestrzeni", "Organizacja wnętrza", "Precyzyjne połączenia"], ["Funkcjonalny podział", "Połączenia materiałów", "Czyste linie"], ["Spójność elementów", "Przygotowanie techniczne", "Wspólna realizacja"]],
    learnMore: "Dowiedz się więcej", routeTitle: "Od projektu do realizacji.", routeCta: "Jak pracujemy",
    craftKicker: "OD PROJEKTU DO REALIZACJI", craftTitle: "Uczciwe materiały. Wyjątkowe rezultaty.", craftBody: "Łączymy naturalne materiały, precyzyjne wykonanie i ponadczasowy design.",
    contactKicker: "TWÓJ PROJEKT", contactTitle: "Zacznijmy od przestrzeni, która będzie Twoja.",
    processIntro: "Jeden zespół. Jeden spójny proces.", processBody: "Każdy etap ma jasny rezultat, odpowiedzialność i akceptację.", processRule: "Bez akceptacji nie przechodzimy do kolejnego etapu.",
    materialsIntro: "Kategorie materiałów.", materialsBody: "Każdy wybór rozpatrujemy w kontekście całego projektu.",
    materialCtas: ["Poznaj powierzchnie", "Poznaj blaty", "Poznaj okucia", "Poznaj detale"],
    criteriaTitle: "Jak wybieramy materiały.", criteria: [["Wygląd", "Kolor, struktura i ciągłość"], ["Trwałość", "Obciążenie i sposób użytkowania"], ["Pielęgnacja", "Czyszczenie i codzienna dbałość"], ["Budżet", "Balans rozwiązania i wartości"]],
    materialContextKicker: "RZEMIOSŁO W KAŻDYM DETALU", materialContextTitle: "Materiał nie jest dekoracją. Jest częścią konstrukcji.", materialContextBody: "Łączymy estetykę, funkcję i trwałość, aby meble miały sens dziś i za wiele lat.",
    plannerMaterialsTitle: "Wybieraj materiały bezpośrednio w projekcie.", plannerMaterialsBody: "Porównuj powierzchnie w 3D i zobacz, jak wpływają na wygląd i orientacyjną cenę kuchni.",
    projectsIntro: "Wybrane realizacje.", allProjects: "Wszystkie", nextProjectTitle: "Kolejna realizacja może być Twoja.",
    aboutDirect: "Klient rozmawia bezpośrednio z ludźmi odpowiedzialnymi za rezultat.", aboutTeamBody: "Od projektu i produkcji po montaż.",
    responsibilityTitle: "Jedna odpowiedzialność.", responsibilityBody: "Każdy projekt prowadzimy jako jedną całość, bez utraty informacji między etapami.", responsibilitySteps: [["Projekt", "Przestrzeń, potrzeby i rozwiązanie"], ["Przygotowanie techniczne", "Konstrukcja i materiały"], ["Produkcja", "Precyzyjne wykonanie"], ["Dostawa i montaż", "Zakończenie w realnej przestrzeni"]],
    realityKicker: "PRAGA · REPUBLIKA CZESKA", realityTitle: "Od projektu do realizacji w prawdziwych wnętrzach.", realityBody: "Projektujemy, przygotowujemy technicznie, produkujemy i montujemy meble na wymiar.",
    contactDirectKicker: "WOLISZ POROZMAWIAĆ?", contactDirectTitle: "Skontaktuj się bezpośrednio. Bez formularza.", contactDirectCta: "Napisz na WhatsApp",
    formKicker: "NIEZOBOWIĄZUJĄCE ZAPYTANIE", projectTypeLabel: "Typ projektu", locationLabel: "MIEJSCE", projectTypes: ["Kuchnia", "Szafy w zabudowie", "Kompletne wnętrze"], attachments: "Materiały projektu", privacy: "Materiały wykorzystamy wyłącznie do oceny projektu.",
  },
  de: {
    servicesIntro: "Unsere Leistungen.", servicesBody: "Vom ersten Entwurf bis zur präzisen Montage.",
    serviceTags: [["Planung und Ergonomie", "Materialien und Beschläge", "Fertigung und Montage"], ["Passgenau für den Raum", "Innenorganisation", "Präzise Anschlüsse"], ["Funktionale Gliederung", "Materialkombinationen", "Klare Linien"], ["Abgestimmte Elemente", "Technische Vorbereitung", "Gemeinsame Umsetzung"]],
    learnMore: "Mehr erfahren", routeTitle: "Vom Entwurf zur Umsetzung.", routeCta: "So arbeiten wir",
    craftKicker: "VOM ENTWURF ZUR UMSETZUNG", craftTitle: "Ehrliche Materialien. Außergewöhnliche Ergebnisse.", craftBody: "Wir verbinden natürliche Materialien, präzise Verarbeitung und zeitloses Design.",
    contactKicker: "IHR PROJEKT", contactTitle: "Beginnen wir mit einem Raum, der Ihrer wird.",
    processIntro: "Ein Team. Ein durchgängiger Prozess.", processBody: "Jede Phase hat ein klares Ergebnis, Verantwortung und Freigabe.", processRule: "Ohne Freigabe gehen wir nicht zur nächsten Phase über.",
    materialsIntro: "Materialkategorien.", materialsBody: "Jede Auswahl betrachten wir im Zusammenhang mit dem gesamten Projekt.",
    materialCtas: ["Oberflächen entdecken", "Arbeitsplatten entdecken", "Beschläge entdecken", "Details entdecken"],
    criteriaTitle: "So wählen wir Materialien.", criteria: [["Optik", "Farbe, Struktur und Übergänge"], ["Beständigkeit", "Belastung und Nutzungsweise"], ["Pflege", "Reinigung und tägliche Nutzung"], ["Budget", "Verhältnis von Lösung und Gesamtwert"]],
    materialContextKicker: "HANDWERK IN JEDEM DETAIL", materialContextTitle: "Material ist keine Dekoration. Es ist Teil der Konstruktion.", materialContextBody: "Wir verbinden Ästhetik, Funktion und Langlebigkeit, damit Möbel heute und in vielen Jahren überzeugen.",
    plannerMaterialsTitle: "Materialien direkt im Entwurf wählen.", plannerMaterialsBody: "Vergleichen Sie Oberflächen in 3D und sehen Sie ihren Einfluss auf Optik und Richtpreis.",
    projectsIntro: "Ausgewählte Projekte.", allProjects: "Alle", nextProjectTitle: "Ihr Raum könnte unser nächstes Projekt sein.",
    aboutDirect: "Kunden sprechen direkt mit den Menschen, die für das Ergebnis verantwortlich sind.", aboutTeamBody: "Von Planung und Fertigung bis zur Montage.",
    responsibilityTitle: "Eine Verantwortung.", responsibilityBody: "Wir führen jedes Projekt als Ganzes, ohne Informationsverlust zwischen den Phasen.", responsibilitySteps: [["Entwurf", "Raum, Bedürfnisse und Lösung"], ["Technische Vorbereitung", "Konstruktion und Materialien"], ["Fertigung", "Präzise Verarbeitung"], ["Lieferung und Montage", "Fertigstellung im realen Raum"]],
    realityKicker: "PRAG · TSCHECHISCHE REPUBLIK", realityTitle: "Vom Entwurf zur Umsetzung in echten Räumen.", realityBody: "Wir planen, entwickeln technisch, fertigen und montieren Möbel nach Maß.",
    contactDirectKicker: "LIEBER PERSÖNLICH?", contactDirectTitle: "Kontaktieren Sie uns direkt. Ohne Formular.", contactDirectCta: "Über WhatsApp schreiben",
    formKicker: "UNVERBINDLICHE ANFRAGE", projectTypeLabel: "Projekttyp", locationLabel: "ORT", projectTypes: ["Küche", "Einbauschränke", "Komplettes Interieur"], attachments: "Projektunterlagen", privacy: "Ihre Unterlagen nutzen wir ausschließlich zur Projektbewertung.",
  },
};
