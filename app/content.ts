export type Lang = "cs" | "ru" | "ua" | "en" | "pl" | "de";

export type SiteCopy = {
  nav: string[]; menu: string;
  heroKicker: string; heroTitleTop: string; heroTitleBottom: string; heroBody: string;
  plannerPrimary: string; atelierCta: string; heroPhases: string[]; heroSide: string; scroll: string;
  materialKicker: string; materialTitle: string; materialContinue: string;
  stats: string[][]; projectsKicker: string; projectsTitle: string; projectsBody: string;
  projects: { title: string; meta: string }[];
  servicesKicker: string; servicesTitle: string; serviceItems: string[][];
  materialsKicker: string; materialsTitle: string; materialsBody: string;
  plannerKicker: string; plannerTitle: string; plannerBody: string;
  aboutKicker: string; aboutTitle: string; aboutBody: string; team: string[][];
  processKicker: string; processTitle: string; process: string[][];
  b2bKicker: string; b2bTitle: string; b2bBody: string; b2bCta: string;
  contactKicker: string; contactTitle: string; contactBody: string; location: string;
  form: string[]; upload: string; footer: string;
};

export const languages: { code: Lang; label: string }[] = [
  { code: "ru", label: "RU" }, { code: "ua", label: "UA" }, { code: "cs", label: "CS" },
  { code: "en", label: "EN" }, { code: "pl", label: "PL" }, { code: "de", label: "DE" },
];

export const copy: Record<Lang, SiteCopy> = {
  cs: {
    nav:["Realizace","Služby","Materiály","O ateliéru","Kontakt"], menu:"Menu",
    heroKicker:"NÁBYTEK, KTERÝ S VÁMI ŽIJE", heroTitleTop:"Interiér, který", heroTitleBottom:"nese váš rukopis.", heroBody:"Na míru. Od myšlenky po poslední detail.",
    plannerPrimary:"Vytvořit v Dream Planner", atelierCta:"Objevit ateliér", heroPhases:["Návrh","Výroba","Montáž"], heroSide:"DETAILY, KTERÉ DĚLAJÍ ROZDÍL", scroll:"SCROLLUJTE DÁL",
    materialKicker:"ŽIVÉ MATERIÁLY · SKUTEČNÉ PŘÍBĚHY", materialTitle:"Materiály, které tvoří domov.", materialContinue:"POKRAČOVAT",
    stats:[["Vyrobeno v Česku","Technická přesnost"],["Jeden tým","Návrh, výroba i montáž"],["Realizace po Evropě","Doprava a odborná montáž"]],
    projectsKicker:"VYBRANÉ REALIZACE", projectsTitle:"Skutečné prostory. Skutečná práce.", projectsBody:"Nábytek, který jsme opravdu navrhli, vyrobili a namontovali.",
    projects:[{title:"Kuchyň s poloostrovem",meta:"Bílý mat · dub · Praha"},{title:"Kuchyň pod trámy",meta:"Výroba na míru · Beroun"},{title:"Vestavěné skříně",meta:"Úložný prostor do stropu · Praha"}],
    servicesKicker:"CO VYRÁBÍME", servicesTitle:"Jeden rukopis pro celý interiér.",
    serviceItems:[["Kuchyně na míru","Promyšlená dispozice, ergonomie, spotřebiče a úložné prostory."],["Vestavěné skříně","Přesné řešení od stěny ke stěně a maximální využití prostoru."],["Šatny a obývací sestavy","Jednotný styl, chytré vnitřní členění a čisté linie."],["Kompletní nábytkové celky","Kuchyň, šatna, pracovna i atypické prvky v jednom projektu."]],
    materialsKicker:"MATERIÁL A ŘEMESLO", materialsTitle:"Poctivé materiály. Výjimečné detaily.", materialsBody:"Materiál vybíráme podle vzhledu, zatížení a životnosti. Každý dekor, hrana, kování i spoj má v projektu svůj důvod.",
    plannerKicker:"OD PŘEDSTAVY K PRVNÍMU NÁVRHU", plannerTitle:"Vaše kuchyň začíná v Dream Planner.", plannerBody:"Zvolte dispozici, rozměry, materiály a vybavení. Uvidíte kuchyň ještě před výrobou a návrh nám odešlete k technickému zpracování.",
    aboutKicker:"OSOBNÍ ODPOVĚDNOST", aboutTitle:"Za každým projektem stojíme osobně.", aboutBody:"Od prvního rozhovoru po předání hotového interiéru víte, kdo za jednotlivé etapy odpovídá.",
    team:[["Vyacheslav Mayster","Vedení projektů a komunikace"],["Yuriy Maksimchenko","Technické řešení a výroba"],["Evgeniy Nikonorov","Vedení montážního úseku"]],
    processKicker:"JAK PRACUJEME", processTitle:"Od první myšlenky po přesnou montáž.",
    process:[["Konzultace","Probereme prostor, potřeby, styl a rozsah projektu."],["Návrh a zaměření","Prověříme rozměry, návaznosti a technické detaily."],["Odsouhlasení","Potvrdíme materiály, cenu, termín a odpovědnost."],["Výroba","Připravíme každý díl a kontrolujeme klíčové etapy."],["Montáž a předání","Přivezeme, osadíme, seřídíme a předáme hotový celek."]],
    b2bKicker:"PRO DESIGNÉRY A ARCHITEKTY", b2bTitle:"Vaše vize. Naše přesná realizace.", b2bBody:"Technická příprava, výroba na míru a montáž v jednom partnerství. Autorský záměr zůstává čitelný až do posledního detailu.", b2bCta:"Navázat spolupráci",
    contactKicker:"NEZÁVAZNÁ KONZULTACE", contactTitle:"Začněme vaším prostorem.", contactBody:"Pošlete základní informace. Ozveme se s konkrétním dalším krokem.", location:"Praha · Česká republika",
    form:["Jméno a příjmení","E-mail nebo telefon","Stručně o projektu","Odeslat poptávku"], upload:"Výkresy a fotografie můžete poslat na info@maksteratelier.com", footer:"Nábytek na míru · Praha · Evropa",
  },
  ru: {
    nav:["Реализации","Услуги","Материалы","Об ателье","Контакты"], menu:"Меню",
    heroKicker:"МЕБЕЛЬ, КОТОРАЯ ЖИВЁТ ВМЕСТЕ С ВАМИ", heroTitleTop:"Интерьер, который", heroTitleBottom:"несёт ваш почерк.", heroBody:"По вашим размерам. От идеи до последней детали.",
    plannerPrimary:"Создать в Dream Planner", atelierCta:"Открыть ателье", heroPhases:["Проект","Производство","Монтаж"], heroSide:"ДЕТАЛИ, КОТОРЫЕ СОЗДАЮТ РАЗНИЦУ", scroll:"СМОТРЕТЬ ДАЛЬШЕ",
    materialKicker:"ЖИВЫЕ МАТЕРИАЛЫ · НАСТОЯЩИЕ ИСТОРИИ", materialTitle:"Материалы, из которых складывается дом.", materialContinue:"ПРОДОЛЖИТЬ",
    stats:[["Сделано в Чехии","Техническая точность"],["Одна команда","Проект, производство и монтаж"],["Работаем по Европе","Доставка и профессиональный монтаж"]],
    projectsKicker:"ИЗБРАННЫЕ РЕАЛИЗАЦИИ", projectsTitle:"Реальные пространства. Настоящая работа.", projectsBody:"Мебель, которую мы действительно спроектировали, изготовили и установили.",
    projects:[{title:"Кухня с полуостровом",meta:"Белый мат · дуб · Прага"},{title:"Кухня под балками",meta:"Изготовление на заказ · Бероун"},{title:"Встроенные шкафы",meta:"Хранение до потолка · Прага"}],
    servicesKicker:"ЧТО МЫ СОЗДАЁМ", servicesTitle:"Единый почерк для всего интерьера.",
    serviceItems:[["Кухни на заказ","Продуманная планировка, эргономика, техника и хранение."],["Встроенные шкафы","Точное решение от стены до стены и максимум полезного пространства."],["Гардеробные и гостиные","Единый стиль, удобное наполнение и чистые линии."],["Комплексные интерьеры","Кухня, гардеробная, кабинет и нестандартные элементы в одном проекте."]],
    materialsKicker:"МАТЕРИАЛЫ И МАСТЕРСТВО", materialsTitle:"Честные материалы. Исключительные детали.", materialsBody:"Подбираем материалы по внешнему виду, нагрузке и сроку службы. Каждый декор, кромка, механизм и узел имеет смысл.",
    plannerKicker:"ОТ ИДЕИ К ПЕРВОМУ ПРОЕКТУ", plannerTitle:"Ваша кухня начинается в Dream Planner.", plannerBody:"Выберите планировку, размеры, материалы и оснащение. Увидьте кухню до изготовления и отправьте проект нам на техническую проработку.",
    aboutKicker:"ЛИЧНАЯ ОТВЕТСТВЕННОСТЬ", aboutTitle:"За каждым проектом мы стоим лично.", aboutBody:"От первого разговора до сдачи готового интерьера вы знаете, кто отвечает за каждый этап.",
    team:[["Vyacheslav Mayster","Проекты и коммуникация"],["Yuriy Maksimchenko","Технические решения и производство"],["Evgeniy Nikonorov","Руководство монтажным участком"]],
    processKicker:"КАК МЫ РАБОТАЕМ", processTitle:"От первой идеи до точного монтажа.",
    process:[["Консультация","Обсуждаем пространство, задачи, стиль и объём проекта."],["Проект и замер","Проверяем размеры, примыкания и технические детали."],["Согласование","Фиксируем материалы, цену, срок и ответственность."],["Производство","Изготавливаем детали и контролируем ключевые этапы."],["Монтаж и сдача","Доставляем, устанавливаем, регулируем и сдаём готовый интерьер."]],
    b2bKicker:"ДЛЯ ДИЗАЙНЕРОВ И АРХИТЕКТОРОВ", b2bTitle:"Ваше видение. Наша точная реализация.", b2bBody:"Техническая подготовка, производство и монтаж в одном партнёрстве. Авторский замысел сохраняется до последней детали.", b2bCta:"Начать сотрудничество",
    contactKicker:"БЕСПЛАТНАЯ КОНСУЛЬТАЦИЯ", contactTitle:"Начнём с вашего пространства.", contactBody:"Пришлите основную информацию — ответим с конкретным следующим шагом.", location:"Прага · Чешская Республика",
    form:["Имя и фамилия","E-mail или телефон","Кратко о проекте","Отправить заявку"], upload:"Чертежи и фотографии можно отправить на info@maksteratelier.com", footer:"Мебель на заказ · Прага · Европа",
  },
  ua: {
    nav:["Реалізації","Послуги","Матеріали","Про ательє","Контакти"], menu:"Меню",
    heroKicker:"МЕБЛІ, ЩО ЖИВУТЬ РАЗОМ ІЗ ВАМИ", heroTitleTop:"Інтер’єр, що", heroTitleBottom:"зберігає ваш почерк.", heroBody:"За вашими розмірами. Від задуму до останньої деталі.",
    plannerPrimary:"Створити в Dream Planner", atelierCta:"Відкрити ательє", heroPhases:["Проєкт","Виробництво","Монтаж"], heroSide:"ДЕТАЛІ, ЩО СТВОРЮЮТЬ РІЗНИЦЮ", scroll:"ДИВИТИСЯ ДАЛІ",
    materialKicker:"ЖИВІ МАТЕРІАЛИ · СПРАВЖНІ ІСТОРІЇ", materialTitle:"Матеріали, з яких складається дім.", materialContinue:"ПРОДОВЖИТИ",
    stats:[["Виготовлено в Чехії","Технічна точність"],["Одна команда","Проєкт, виробництво та монтаж"],["Працюємо по Європі","Доставка та професійний монтаж"]],
    projectsKicker:"ОБРАНІ РЕАЛІЗАЦІЇ", projectsTitle:"Реальні простори. Справжня робота.", projectsBody:"Меблі, які ми справді спроєктували, виготовили та встановили.",
    projects:[{title:"Кухня з півостровом",meta:"Білий мат · дуб · Прага"},{title:"Кухня під балками",meta:"Виготовлення на замовлення · Бероун"},{title:"Вбудовані шафи",meta:"Зберігання до стелі · Прага"}],
    servicesKicker:"ЩО МИ СТВОРЮЄМО", servicesTitle:"Єдиний почерк для всього інтер’єру.",
    serviceItems:[["Кухні на замовлення","Продумане планування, ергономіка, техніка та зберігання."],["Вбудовані шафи","Точне рішення від стіни до стіни та максимум простору."],["Гардеробні та вітальні","Єдиний стиль, зручне наповнення та чисті лінії."],["Комплексні інтер’єри","Кухня, гардеробна, кабінет і нестандартні елементи в одному проєкті."]],
    materialsKicker:"МАТЕРІАЛИ ТА МАЙСТЕРНІСТЬ", materialsTitle:"Чесні матеріали. Виняткові деталі.", materialsBody:"Добираємо матеріали за виглядом, навантаженням і строком служби. Кожен декор, крайка, механізм і вузол має сенс.",
    plannerKicker:"ВІД ІДЕЇ ДО ПЕРШОГО ПРОЄКТУ", plannerTitle:"Ваша кухня починається в Dream Planner.", plannerBody:"Оберіть планування, розміри, матеріали й оснащення. Побачте кухню до виготовлення та надішліть нам проєкт на технічне опрацювання.",
    aboutKicker:"ОСОБИСТА ВІДПОВІДАЛЬНІСТЬ", aboutTitle:"За кожним проєктом ми стоїмо особисто.", aboutBody:"Від першої розмови до здачі готового інтер’єру ви знаєте, хто відповідає за кожен етап.",
    team:[["Vyacheslav Mayster","Проєкти та комунікація"],["Yuriy Maksimchenko","Технічні рішення та виробництво"],["Evgeniy Nikonorov","Керівництво монтажною дільницею"]],
    processKicker:"ЯК МИ ПРАЦЮЄМО", processTitle:"Від першої ідеї до точного монтажу.",
    process:[["Консультація","Обговорюємо простір, потреби, стиль і обсяг проєкту."],["Проєкт і замір","Перевіряємо розміри, примикання та технічні деталі."],["Погодження","Фіксуємо матеріали, ціну, термін і відповідальність."],["Виробництво","Виготовляємо деталі та контролюємо ключові етапи."],["Монтаж і здача","Доставляємо, монтуємо, регулюємо й здаємо готовий інтер’єр."]],
    b2bKicker:"ДЛЯ ДИЗАЙНЕРІВ ТА АРХІТЕКТОРІВ", b2bTitle:"Ваше бачення. Наша точна реалізація.", b2bBody:"Технічна підготовка, виробництво та монтаж в одному партнерстві. Авторський задум зберігається до останньої деталі.", b2bCta:"Почати співпрацю",
    contactKicker:"БЕЗКОШТОВНА КОНСУЛЬТАЦІЯ", contactTitle:"Почнімо з вашого простору.", contactBody:"Надішліть основну інформацію — відповімо з конкретним наступним кроком.", location:"Прага · Чеська Республіка",
    form:["Ім’я та прізвище","E-mail або телефон","Коротко про проєкт","Надіслати запит"], upload:"Креслення та фотографії можна надіслати на info@maksteratelier.com", footer:"Меблі на замовлення · Прага · Європа",
  },
  en: {
    nav:["Projects","Services","Materials","About the atelier","Contact"], menu:"Menu",
    heroKicker:"FURNITURE THAT LIVES WITH YOU", heroTitleTop:"An interior that", heroTitleBottom:"carries your signature.", heroBody:"Made to measure. From the first idea to the final detail.",
    plannerPrimary:"Create in Dream Planner", atelierCta:"Discover the atelier", heroPhases:["Design","Production","Installation"], heroSide:"DETAILS THAT MAKE THE DIFFERENCE", scroll:"SCROLL TO DISCOVER",
    materialKicker:"LIVING MATERIALS · REAL STORIES", materialTitle:"Materials that make a home.", materialContinue:"CONTINUE",
    stats:[["Made in Czechia","Technical precision"],["One team","Design, production and installation"],["Across Europe","Delivery and professional installation"]],
    projectsKicker:"SELECTED PROJECTS", projectsTitle:"Real spaces. Real craftsmanship.", projectsBody:"Furniture we genuinely designed, produced and installed.",
    projects:[{title:"Kitchen with a peninsula",meta:"White matt · oak · Prague"},{title:"Kitchen beneath the beams",meta:"Bespoke construction · Beroun"},{title:"Built-in wardrobes",meta:"Full-height storage · Prague"}],
    servicesKicker:"WHAT WE MAKE", servicesTitle:"One signature across the whole interior.",
    serviceItems:[["Bespoke kitchens","Considered layouts, ergonomics, appliances and storage."],["Built-in wardrobes","Precise wall-to-wall solutions and maximum use of space."],["Dressing rooms and living furniture","One visual language, intelligent interiors and clean lines."],["Complete furniture systems","Kitchen, wardrobe, home office and custom elements in one project."]],
    materialsKicker:"MATERIALS AND CRAFT", materialsTitle:"Honest materials. Exceptional details.", materialsBody:"We select every material for appearance, load and longevity. Every finish, edge, fitting and joint has a purpose.",
    plannerKicker:"FROM IDEA TO FIRST DESIGN", plannerTitle:"Your kitchen begins in Dream Planner.", plannerBody:"Choose the layout, dimensions, materials and equipment. See the kitchen before production and send us the design for technical development.",
    aboutKicker:"PERSONAL RESPONSIBILITY", aboutTitle:"We personally stand behind every project.", aboutBody:"From the first conversation to handover, you always know who is responsible for each stage.",
    team:[["Vyacheslav Mayster","Projects and communication"],["Yuriy Maksimchenko","Technical solutions and production"],["Evgeniy Nikonorov","Installation department lead"]],
    processKicker:"HOW WE WORK", processTitle:"From the first idea to precise installation.",
    process:[["Consultation","We discuss the space, needs, style and project scope."],["Design and survey","We verify dimensions, junctions and technical details."],["Approval","We confirm materials, price, schedule and responsibility."],["Production","We manufacture every part and inspect the key stages."],["Installation and handover","We deliver, install, adjust and hand over the finished interior."]],
    b2bKicker:"FOR DESIGNERS AND ARCHITECTS", b2bTitle:"Your vision. Our precise execution.", b2bBody:"Technical development, bespoke production and installation in one partnership. Your design intent remains clear to the final detail.", b2bCta:"Start a partnership",
    contactKicker:"FREE CONSULTATION", contactTitle:"Let’s begin with your space.", contactBody:"Send the essentials and we will reply with a concrete next step.", location:"Prague · Czech Republic",
    form:["Full name","Email or phone","Tell us about the project","Send enquiry"], upload:"Drawings and photos can be sent to info@maksteratelier.com", footer:"Bespoke furniture · Prague · Europe",
  },
  pl: {
    nav:["Realizacje","Usługi","Materiały","O atelier","Kontakt"], menu:"Menu",
    heroKicker:"MEBLE, KTÓRE ŻYJĄ RAZEM Z TOBĄ", heroTitleTop:"Wnętrze, które", heroTitleBottom:"nosi Twój podpis.", heroBody:"Na wymiar. Od pomysłu po ostatni detal.",
    plannerPrimary:"Zaprojektuj w Dream Planner", atelierCta:"Poznaj atelier", heroPhases:["Projekt","Produkcja","Montaż"], heroSide:"DETALE, KTÓRE ROBIĄ RÓŻNICĘ", scroll:"ODKRYWAJ DALEJ",
    materialKicker:"ŻYWE MATERIAŁY · PRAWDZIWE HISTORIE", materialTitle:"Materiały, które tworzą dom.", materialContinue:"DALEJ",
    stats:[["Wyprodukowano w Czechach","Techniczna precyzja"],["Jeden zespół","Projekt, produkcja i montaż"],["W całej Europie","Dostawa i profesjonalny montaż"]],
    projectsKicker:"WYBRANE REALIZACJE", projectsTitle:"Prawdziwe przestrzenie. Prawdziwe rzemiosło.", projectsBody:"Meble, które naprawdę zaprojektowaliśmy, wykonaliśmy i zamontowaliśmy.",
    projects:[{title:"Kuchnia z półwyspem",meta:"Biały mat · dąb · Praga"},{title:"Kuchnia pod belkami",meta:"Zabudowa na wymiar · Beroun"},{title:"Szafy w zabudowie",meta:"Zabudowa do sufitu · Praga"}],
    servicesKicker:"CO TWORZYMY", servicesTitle:"Jeden charakter w całym wnętrzu.",
    serviceItems:[["Kuchnie na wymiar","Przemyślany układ, ergonomia, AGD i przechowywanie."],["Szafy w zabudowie","Precyzyjne rozwiązania od ściany do ściany."],["Garderoby i meble salonowe","Spójny styl, inteligentne wnętrze i czyste linie."],["Kompletne zabudowy","Kuchnia, garderoba, gabinet i elementy nietypowe w jednym projekcie."]],
    materialsKicker:"MATERIAŁ I RZEMIOSŁO", materialsTitle:"Uczciwe materiały. Wyjątkowe detale.", materialsBody:"Dobieramy materiały pod względem wyglądu, obciążenia i trwałości. Każdy dekor, krawędź, okucie i łączenie ma znaczenie.",
    plannerKicker:"OD POMYSŁU DO PIERWSZEGO PROJEKTU", plannerTitle:"Twoja kuchnia zaczyna się w Dream Planner.", plannerBody:"Wybierz układ, wymiary, materiały i wyposażenie. Zobacz kuchnię przed produkcją i wyślij nam projekt do opracowania technicznego.",
    aboutKicker:"OSOBISTA ODPOWIEDZIALNOŚĆ", aboutTitle:"Osobiście stoimy za każdym projektem.", aboutBody:"Od pierwszej rozmowy po odbiór wiesz, kto odpowiada za każdy etap.",
    team:[["Vyacheslav Mayster","Projekty i komunikacja"],["Yuriy Maksimchenko","Rozwiązania techniczne i produkcja"],["Evgeniy Nikonorov","Kierownik działu montażu"]],
    processKicker:"JAK PRACUJEMY", processTitle:"Od pierwszej idei po precyzyjny montaż.",
    process:[["Konsultacja","Omawiamy przestrzeń, potrzeby, styl i zakres projektu."],["Projekt i pomiar","Sprawdzamy wymiary, połączenia i szczegóły techniczne."],["Akceptacja","Potwierdzamy materiały, cenę, termin i odpowiedzialność."],["Produkcja","Wykonujemy elementy i kontrolujemy kluczowe etapy."],["Montaż i odbiór","Dostarczamy, montujemy, regulujemy i przekazujemy gotowe wnętrze."]],
    b2bKicker:"DLA PROJEKTANTÓW I ARCHITEKTÓW", b2bTitle:"Twoja wizja. Nasza precyzyjna realizacja.", b2bBody:"Przygotowanie techniczne, produkcja na wymiar i montaż w jednym partnerstwie. Autorska wizja pozostaje czytelna do ostatniego detalu.", b2bCta:"Rozpocznij współpracę",
    contactKicker:"BEZPŁATNA KONSULTACJA", contactTitle:"Zacznijmy od Twojej przestrzeni.", contactBody:"Prześlij podstawowe informacje, a wrócimy z konkretnym kolejnym krokiem.", location:"Praga · Republika Czeska",
    form:["Imię i nazwisko","E-mail lub telefon","Krótko o projekcie","Wyślij zapytanie"], upload:"Rysunki i zdjęcia możesz wysłać na info@maksteratelier.com", footer:"Meble na wymiar · Praga · Europa",
  },
  de: {
    nav:["Projekte","Leistungen","Materialien","Über das Atelier","Kontakt"], menu:"Menü",
    heroKicker:"MÖBEL, DIE MIT IHNEN LEBEN", heroTitleTop:"Ein Interieur mit", heroTitleBottom:"Ihrer Handschrift.", heroBody:"Nach Maß. Von der Idee bis zum letzten Detail.",
    plannerPrimary:"Im Dream Planner gestalten", atelierCta:"Atelier entdecken", heroPhases:["Entwurf","Fertigung","Montage"], heroSide:"DETAILS, DIE DEN UNTERSCHIED MACHEN", scroll:"WEITER ENTDECKEN",
    materialKicker:"LEBENDIGE MATERIALIEN · ECHTE GESCHICHTEN", materialTitle:"Materialien, die ein Zuhause schaffen.", materialContinue:"WEITER",
    stats:[["Gefertigt in Tschechien","Technische Präzision"],["Ein Team","Planung, Fertigung und Montage"],["Europaweit","Lieferung und fachgerechte Montage"]],
    projectsKicker:"AUSGEWÄHLTE PROJEKTE", projectsTitle:"Echte Räume. Echtes Handwerk.", projectsBody:"Möbel, die wir tatsächlich entworfen, gefertigt und montiert haben.",
    projects:[{title:"Küche mit Halbinsel",meta:"Weiß matt · Eiche · Prag"},{title:"Küche unter Balken",meta:"Maßanfertigung · Beroun"},{title:"Einbauschränke",meta:"Stauraum bis zur Decke · Prag"}],
    servicesKicker:"WAS WIR FERTIGEN", servicesTitle:"Eine Handschrift für das gesamte Interieur.",
    serviceItems:[["Küchen nach Maß","Durchdachte Planung, Ergonomie, Geräte und Stauraum."],["Einbauschränke","Präzise Lösungen von Wand zu Wand."],["Ankleiden und Wohnmöbel","Ein Stil, intelligente Innenaufteilung und klare Linien."],["Komplette Möbelsysteme","Küche, Ankleide, Arbeitszimmer und Sonderteile in einem Projekt."]],
    materialsKicker:"MATERIAL UND HANDWERK", materialsTitle:"Ehrliche Materialien. Außergewöhnliche Details.", materialsBody:"Wir wählen Materialien nach Optik, Belastung und Lebensdauer. Jedes Dekor, jede Kante und jeder Beschlag hat seinen Zweck.",
    plannerKicker:"VON DER IDEE ZUM ERSTEN ENTWURF", plannerTitle:"Ihre Küche beginnt im Dream Planner.", plannerBody:"Wählen Sie Grundriss, Maße, Materialien und Ausstattung. Sehen Sie die Küche vor der Produktion und senden Sie uns den Entwurf zur technischen Bearbeitung.",
    aboutKicker:"PERSÖNLICHE VERANTWORTUNG", aboutTitle:"Wir stehen persönlich hinter jedem Projekt.", aboutBody:"Vom ersten Gespräch bis zur Übergabe wissen Sie, wer für jede Phase verantwortlich ist.",
    team:[["Vyacheslav Mayster","Projekte und Kommunikation"],["Yuriy Maksimchenko","Technik und Produktion"],["Evgeniy Nikonorov","Leitung Montage"]],
    processKicker:"SO ARBEITEN WIR", processTitle:"Von der ersten Idee bis zur präzisen Montage.",
    process:[["Beratung","Wir besprechen Raum, Anforderungen, Stil und Umfang."],["Planung und Aufmaß","Wir prüfen Maße, Anschlüsse und technische Details."],["Freigabe","Wir bestätigen Materialien, Preis, Termin und Verantwortung."],["Fertigung","Wir fertigen jedes Teil und kontrollieren die Schlüsselphasen."],["Montage und Übergabe","Wir liefern, montieren, justieren und übergeben das fertige Interieur."]],
    b2bKicker:"FÜR DESIGNER UND ARCHITEKTEN", b2bTitle:"Ihre Vision. Unsere präzise Umsetzung.", b2bBody:"Technische Vorbereitung, Maßanfertigung und Montage aus einer Hand. Ihre Gestaltungsidee bleibt bis ins letzte Detail erhalten.", b2bCta:"Zusammenarbeit starten",
    contactKicker:"KOSTENLOSE BERATUNG", contactTitle:"Beginnen wir mit Ihrem Raum.", contactBody:"Senden Sie uns die Eckdaten. Wir antworten mit einem konkreten nächsten Schritt.", location:"Prag · Tschechische Republik",
    form:["Vor- und Nachname","E-Mail oder Telefon","Kurz zum Projekt","Anfrage senden"], upload:"Zeichnungen und Fotos können Sie an info@maksteratelier.com senden", footer:"Möbel nach Maß · Prag · Europa",
  },
};
