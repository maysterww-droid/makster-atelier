import type { Lang } from "./content";

export type MaterialLibraryCopy = {
  title: string;
  intro: string;
  sampleTitle: string;
  sampleBody: string;
  sampleCta: string;
  categories: {
    id: "facades" | "worktops" | "hardware" | "details";
    title: string;
    lead: string;
    options: string[];
  }[];
};

export const materialLibraryCopy: Record<Lang, MaterialLibraryCopy> = {
  ru: {
    title: "Что именно можно выбрать.",
    intro: "Это не интернет-магазин декоров. Здесь показаны основные группы решений, которые мы подбираем под архитектуру, нагрузку и бюджет конкретного проекта.",
    sampleTitle: "Финальный выбор — только по физическим образцам.",
    sampleBody: "Экран не передаёт точный оттенок, глубину фактуры и реакцию поверхности на свет. На консультации мы собираем персональную подборку и показываем сочетания вживую.",
    sampleCta: "Запросить образцы",
    categories: [
      { id: "facades", title: "Фасады и декоры", lead: "От спокойного матового фона до выразительной древесной фактуры.", options: ["Крашеный МДФ · мат и сатин", "Натуральный шпон", "Декоры EGGER и CLEAF", "Наноматовые поверхности FENIX"] },
      { id: "worktops", title: "Столешницы", lead: "Подбираем поверхность под влагу, температуру, уход и характер ежедневной работы.", options: ["Кварцевый композит", "Керамика и спечённый камень", "Компакт-плита HPL", "Ламинированные столешницы"] },
      { id: "hardware", title: "Фурнитура", lead: "Механика определяет, насколько тихо, точно и долго работает мебель.", options: ["Петли BLUM с доводчиками", "Ящики LEGRABOX и MERIVOBOX", "Подъёмники AVENTOS", "Раздвижные системы Hettich"] },
      { id: "details", title: "Свет и детали", lead: "Последний слой проекта: свет, ручки, стекло, металл и аккуратные примыкания.", options: ["Встроенные LED-профили", "Ручки и профильные захваты", "Стекло и металл", "Кромки, стыки и примыкания"] },
    ],
  },
  ua: {
    title: "Що саме можна обрати.",
    intro: "Це не інтернет-магазин декорів. Тут показані основні групи рішень, які ми добираємо під архітектуру, навантаження та бюджет конкретного проєкту.",
    sampleTitle: "Фінальний вибір — лише за фізичними зразками.",
    sampleBody: "Екран не передає точний відтінок, глибину фактури й реакцію поверхні на світло. На консультації ми готуємо персональну добірку та показуємо поєднання наживо.",
    sampleCta: "Запросити зразки",
    categories: [
      { id: "facades", title: "Фасади й декори", lead: "Від спокійного матового тла до виразної деревної фактури.", options: ["Фарбований МДФ · мат і сатин", "Натуральний шпон", "Декори EGGER і CLEAF", "Наноматові поверхні FENIX"] },
      { id: "worktops", title: "Стільниці", lead: "Добираємо поверхню під вологу, температуру, догляд і щоденне навантаження.", options: ["Кварцовий композит", "Кераміка та спечений камінь", "Компакт-плита HPL", "Ламіновані стільниці"] },
      { id: "hardware", title: "Фурнітура", lead: "Механіка визначає, наскільки тихо, точно й довго працюють меблі.", options: ["Петлі BLUM з дотягувачами", "Шухляди LEGRABOX і MERIVOBOX", "Підіймачі AVENTOS", "Розсувні системи Hettich"] },
      { id: "details", title: "Світло й деталі", lead: "Завершальний шар проєкту: світло, ручки, скло, метал і точні примикання.", options: ["Вбудовані LED-профілі", "Ручки та профільні захвати", "Скло й метал", "Крайки, стики та примикання"] },
    ],
  },
  cs: {
    title: "Co přesně můžete vybírat.",
    intro: "Nejde o e-shop s dekory. Ukazujeme hlavní skupiny řešení, které vybíráme podle architektury, zatížení a rozpočtu konkrétního projektu.",
    sampleTitle: "Finální výběr vždy podle fyzických vzorků.",
    sampleBody: "Obrazovka nepřenese přesný odstín, hloubku struktury ani reakci povrchu na světlo. Na konzultaci připravíme osobní výběr a kombinace ukážeme naživo.",
    sampleCta: "Vyžádat vzorky",
    categories: [
      { id: "facades", title: "Dvířka a dekory", lead: "Od klidného matného podkladu po výraznou strukturu dřeva.", options: ["Lakovaná MDF · mat a satén", "Přírodní dýha", "Dekory EGGER a CLEAF", "Nanomatné povrchy FENIX"] },
      { id: "worktops", title: "Pracovní desky", lead: "Povrch volíme podle vlhkosti, teploty, údržby a každodenního zatížení.", options: ["Křemenný kompozit", "Keramika a slinutý kámen", "Kompaktní HPL", "Laminované pracovní desky"] },
      { id: "hardware", title: "Kování", lead: "Mechanika rozhoduje o tichém, přesném a dlouhodobém fungování nábytku.", options: ["Panty BLUM s tlumením", "Zásuvky LEGRABOX a MERIVOBOX", "Výklopy AVENTOS", "Posuvné systémy Hettich"] },
      { id: "details", title: "Světlo a detaily", lead: "Poslední vrstva projektu: světlo, úchytky, sklo, kov a čistá napojení.", options: ["Integrované LED profily", "Úchytky a profilová madla", "Sklo a kov", "Hrany, spoje a napojení"] },
    ],
  },
  en: {
    title: "What you can actually select.",
    intro: "This is not an online décor shop. It is a clear overview of the solution groups we specify around the architecture, daily use and budget of each project.",
    sampleTitle: "Final decisions are made with physical samples.",
    sampleBody: "A screen cannot show the exact tone, depth of texture or response to light. During consultation we prepare a tailored sample set and compare combinations in person.",
    sampleCta: "Request samples",
    categories: [
      { id: "facades", title: "Fronts and décors", lead: "From calm matt backgrounds to expressive natural wood grain.", options: ["Painted MDF · matt and satin", "Natural veneer", "EGGER and CLEAF décors", "FENIX nanomatt surfaces"] },
      { id: "worktops", title: "Worktops", lead: "Selected for moisture, heat, care requirements and real daily use.", options: ["Quartz composite", "Ceramic and sintered stone", "Compact HPL", "Laminate worktops"] },
      { id: "hardware", title: "Hardware", lead: "The mechanism determines how quietly, precisely and reliably furniture works.", options: ["BLUM soft-close hinges", "LEGRABOX and MERIVOBOX drawers", "AVENTOS lift systems", "Hettich sliding systems"] },
      { id: "details", title: "Lighting and details", lead: "The final layer: lighting, handles, glass, metal and clean junctions.", options: ["Integrated LED profiles", "Handles and grip profiles", "Glass and metal", "Edges, joints and junctions"] },
    ],
  },
  pl: {
    title: "Co dokładnie można wybrać.",
    intro: "To nie jest internetowy sklep z dekorami. Pokazujemy główne grupy rozwiązań dobieranych do architektury, obciążenia i budżetu konkretnego projektu.",
    sampleTitle: "Ostateczny wybór zawsze na podstawie próbek.",
    sampleBody: "Ekran nie oddaje dokładnego odcienia, głębi faktury ani reakcji powierzchni na światło. Podczas konsultacji przygotowujemy indywidualny zestaw i pokazujemy połączenia na żywo.",
    sampleCta: "Poproś o próbki",
    categories: [
      { id: "facades", title: "Fronty i dekory", lead: "Od spokojnego matu po wyrazistą strukturę naturalnego drewna.", options: ["Lakierowany MDF · mat i satyna", "Naturalny fornir", "Dekory EGGER i CLEAF", "Nanomatowe powierzchnie FENIX"] },
      { id: "worktops", title: "Blaty", lead: "Dobierane do wilgoci, temperatury, pielęgnacji i codziennego użytkowania.", options: ["Kompozyt kwarcowy", "Ceramika i spiek kwarcowy", "Kompakt HPL", "Blaty laminowane"] },
      { id: "hardware", title: "Okucia", lead: "Mechanika decyduje o cichej, precyzyjnej i wieloletniej pracy mebli.", options: ["Zawiasy BLUM z domykiem", "Szuflady LEGRABOX i MERIVOBOX", "Podnośniki AVENTOS", "Systemy przesuwne Hettich"] },
      { id: "details", title: "Światło i detale", lead: "Ostatnia warstwa projektu: światło, uchwyty, szkło, metal i czyste łączenia.", options: ["Zintegrowane profile LED", "Uchwyty i profile chwytowe", "Szkło i metal", "Krawędzie, styki i łączenia"] },
    ],
  },
  de: {
    title: "Was Sie konkret auswählen können.",
    intro: "Dies ist kein Online-Dekorshop. Wir zeigen die wichtigsten Lösungsgruppen, die wir auf Architektur, Beanspruchung und Budget des jeweiligen Projekts abstimmen.",
    sampleTitle: "Die finale Auswahl erfolgt mit echten Mustern.",
    sampleBody: "Ein Bildschirm zeigt weder den exakten Farbton noch die Tiefe der Struktur oder die Wirkung im Licht. In der Beratung stellen wir eine persönliche Auswahl zusammen und vergleichen Kombinationen vor Ort.",
    sampleCta: "Muster anfragen",
    categories: [
      { id: "facades", title: "Fronten und Dekore", lead: "Von ruhigen matten Flächen bis zu ausdrucksstarken Holzstrukturen.", options: ["Lackiertes MDF · matt und seidenmatt", "Naturfurnier", "Dekore von EGGER und CLEAF", "Nanomatte FENIX-Oberflächen"] },
      { id: "worktops", title: "Arbeitsplatten", lead: "Ausgewählt nach Feuchte, Hitze, Pflege und tatsächlicher Alltagsbelastung.", options: ["Quarzkomposit", "Keramik und Sinterstein", "Kompakt-HPL", "Laminierte Arbeitsplatten"] },
      { id: "hardware", title: "Beschläge", lead: "Die Mechanik bestimmt, wie leise, präzise und dauerhaft Möbel funktionieren.", options: ["BLUM-Scharniere mit Dämpfung", "LEGRABOX- und MERIVOBOX-Schubkästen", "AVENTOS-Klappensysteme", "Hettich-Schiebesysteme"] },
      { id: "details", title: "Licht und Details", lead: "Die letzte Ebene: Licht, Griffe, Glas, Metall und saubere Anschlüsse.", options: ["Integrierte LED-Profile", "Griffe und Griffprofile", "Glas und Metall", "Kanten, Fugen und Anschlüsse"] },
    ],
  },
};
