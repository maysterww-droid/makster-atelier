import type { Lang } from "./content";

export type PageUi = {
  discuss: string;
  viewProjects: string;
  allServices: string;
  stages: string;
  projectCta: string;
  process: [string, string][];
  materials: [string, string][];
  aboutValues: [string, string][];
};

export const pageUi: Record<Lang, PageUi> = {
  ru: {
    discuss: "Обсудить проект", viewProjects: "Смотреть реализации", allServices: "Наши направления", stages: "Этапы работы", projectCta: "Начать свой проект",
    process: [["Консультация","Знакомимся с пространством, задачами, привычками и вашим стилем."],["Концепция в Dream Planner","Собираем первую планировку и понятный образ будущего интерьера."],["Точный замер","Проверяем геометрию, коммуникации и все технические примыкания."],["Рабочий проект","Фиксируем материалы, узлы, цену, сроки и ответственность команды."],["Производство","Изготавливаем детали в Чехии и контролируем ключевые этапы."],["Доставка и монтаж","Привозим, устанавливаем, регулируем и сдаём готовый интерьер."]],
    materials: [["Фасады и декоры","Подбираем поверхность по тактильности, цвету, износостойкости и свету."],["Столешницы","Кварц, компакт-плита и современные поверхности для реальной ежедневной нагрузки."],["Фурнитура","Механизмы BLUM и точная регулировка — тихая, надёжная работа каждого модуля."],["Свет и детали","Профили, подсветка, ручки и кромки, которые собирают интерьер в единое целое."]],
    aboutValues: [["Один проект — одна команда","Проектирование, производство и монтаж не теряются между подрядчиками."],["Личная ответственность","Вы всегда знаете, кто отвечает за решение и следующий шаг."],["Точность в деталях","Каждый узел проверяется до того, как он окажется у вас дома."]],
  },
  ua: {
    discuss: "Обговорити проєкт", viewProjects: "Дивитися реалізації", allServices: "Наші напрямки", stages: "Етапи роботи", projectCta: "Розпочати свій проєкт",
    process: [["Консультація","Знайомимося з простором, завданнями, звичками та вашим стилем."],["Концепція в Dream Planner","Створюємо перше планування й зрозумілий образ майбутнього інтер’єру."],["Точний замір","Перевіряємо геометрію, комунікації та всі технічні примикання."],["Робочий проєкт","Фіксуємо матеріали, вузли, ціну, терміни й відповідальність команди."],["Виробництво","Виготовляємо деталі в Чехії та контролюємо ключові етапи."],["Доставка і монтаж","Привозимо, встановлюємо, регулюємо й здаємо готовий інтер’єр."]],
    materials: [["Фасади та декори","Підбираємо поверхню за тактильністю, кольором, зносостійкістю та світлом."],["Стільниці","Кварц, компакт-плита й сучасні поверхні для реального щоденного навантаження."],["Фурнітура","Механізми BLUM і точне регулювання — тиха та надійна робота кожного модуля."],["Світло й деталі","Профілі, підсвічування, ручки та крайки, що об’єднують інтер’єр."]],
    aboutValues: [["Один проєкт — одна команда","Проєктування, виробництво й монтаж не губляться між підрядниками."],["Особиста відповідальність","Ви завжди знаєте, хто відповідає за рішення та наступний крок."],["Точність у деталях","Кожен вузол перевіряємо до того, як він опиниться у вашому домі."]],
  },
  cs: {
    discuss: "Probrat projekt", viewProjects: "Prohlédnout realizace", allServices: "Naše služby", stages: "Jak pracujeme", projectCta: "Začít vlastní projekt",
    process: [["Konzultace","Poznáme prostor, vaše potřeby, návyky a styl."],["Koncept v Dream Planner","Sestavíme první dispozici a srozumitelnou podobu budoucího interiéru."],["Přesné zaměření","Prověříme geometrii, rozvody a všechny technické návaznosti."],["Prováděcí projekt","Potvrdíme materiály, detaily, cenu, termín a odpovědnost týmu."],["Výroba","Vyrábíme v Česku a kontrolujeme klíčové etapy."],["Doprava a montáž","Přivezeme, osadíme, seřídíme a předáme hotový interiér."]],
    materials: [["Čela a dekory","Povrch volíme podle vzhledu, doteku, odolnosti a světla."],["Pracovní desky","Křemen, kompaktní deska a moderní povrchy pro každodenní provoz."],["Kování","Mechanismy BLUM a přesné seřízení pro tichý a spolehlivý chod."],["Světlo a detaily","Profily, osvětlení, úchytky a hrany, které interiér sjednotí."]],
    aboutValues: [["Jeden projekt — jeden tým","Návrh, výroba a montáž se neztrácejí mezi dodavateli."],["Osobní odpovědnost","Vždy víte, kdo odpovídá za rozhodnutí a další krok."],["Přesnost v detailu","Každý spoj prověříme dřív, než se dostane k vám domů."]],
  },
  en: {
    discuss: "Discuss your project", viewProjects: "View projects", allServices: "What we create", stages: "How we work", projectCta: "Start your project",
    process: [["Consultation","We learn about the space, your needs, routines and personal style."],["Dream Planner concept","We shape the first layout and a clear vision of the future interior."],["Precise survey","We verify geometry, utilities and every technical junction."],["Technical design","We confirm materials, details, price, timeline and responsibilities."],["Production","We manufacture in the Czech Republic and control every key stage."],["Delivery and installation","We deliver, fit, adjust and hand over the finished interior."]],
    materials: [["Fronts and décors","Chosen for touch, colour, durability and the way they respond to light."],["Worktops","Quartz, compact board and advanced surfaces made for daily use."],["Hardware","BLUM systems and precise adjustment for quiet, reliable movement."],["Light and detail","Profiles, lighting, handles and edges that bring the room together."]],
    aboutValues: [["One project — one team","Design, production and installation never disappear between contractors."],["Personal responsibility","You always know who owns the decision and the next step."],["Precision in detail","Every junction is checked before it reaches your home."]],
  },
  pl: {
    discuss: "Omów projekt", viewProjects: "Zobacz realizacje", allServices: "Nasze specjalizacje", stages: "Jak pracujemy", projectCta: "Rozpocznij swój projekt",
    process: [["Konsultacja","Poznajemy przestrzeń, potrzeby, codzienne nawyki i Twój styl."],["Koncepcja w Dream Planner","Budujemy pierwszy układ i czytelną wizję przyszłego wnętrza."],["Dokładny pomiar","Sprawdzamy geometrię, instalacje i wszystkie połączenia techniczne."],["Projekt wykonawczy","Potwierdzamy materiały, detale, cenę, termin i odpowiedzialność."],["Produkcja","Produkujemy w Czechach i kontrolujemy kluczowe etapy."],["Dostawa i montaż","Dostarczamy, montujemy, regulujemy i oddajemy gotowe wnętrze."]],
    materials: [["Fronty i dekory","Powierzchnię dobieramy pod kątem dotyku, koloru, trwałości i światła."],["Blaty","Kwarc, płyta kompaktowa i nowoczesne powierzchnie do codziennego użytkowania."],["Okucia","Systemy BLUM i precyzyjna regulacja zapewniają cichą, niezawodną pracę."],["Światło i detale","Profile, oświetlenie, uchwyty i obrzeża scalające całe wnętrze."]],
    aboutValues: [["Jeden projekt — jeden zespół","Projekt, produkcja i montaż nie giną między wykonawcami."],["Osobista odpowiedzialność","Zawsze wiesz, kto odpowiada za decyzję i kolejny krok."],["Precyzja w detalu","Każde połączenie sprawdzamy, zanim trafi do Twojego domu."]],
  },
  de: {
    discuss: "Projekt besprechen", viewProjects: "Projekte ansehen", allServices: "Unsere Leistungen", stages: "So arbeiten wir", projectCta: "Eigenes Projekt starten",
    process: [["Beratung","Wir lernen den Raum, Ihre Bedürfnisse, Gewohnheiten und Ihren Stil kennen."],["Konzept im Dream Planner","Wir entwickeln den ersten Grundriss und ein klares Bild des Interieurs."],["Präzises Aufmaß","Wir prüfen Geometrie, Anschlüsse und alle technischen Übergänge."],["Ausführungsplanung","Wir bestätigen Materialien, Details, Preis, Termin und Verantwortung."],["Fertigung","Wir fertigen in Tschechien und kontrollieren alle wichtigen Etappen."],["Lieferung und Montage","Wir liefern, montieren, justieren und übergeben das fertige Interieur."]],
    materials: [["Fronten und Dekore","Ausgewählt nach Haptik, Farbe, Beständigkeit und Lichtwirkung."],["Arbeitsplatten","Quarz, Kompaktplatte und moderne Oberflächen für den täglichen Einsatz."],["Beschläge","BLUM-Systeme und präzise Einstellung für leise, zuverlässige Funktion."],["Licht und Details","Profile, Beleuchtung, Griffe und Kanten, die alles verbinden."]],
    aboutValues: [["Ein Projekt — ein Team","Planung, Fertigung und Montage gehen nicht zwischen Partnern verloren."],["Persönliche Verantwortung","Sie wissen immer, wer die Entscheidung und den nächsten Schritt verantwortet."],["Präzision im Detail","Jede Verbindung wird geprüft, bevor sie in Ihr Zuhause kommt."]],
  },
};
