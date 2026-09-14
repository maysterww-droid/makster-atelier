import type { BackMode, ModuleKey } from './engineering';

export type QuoteModuleFamily = 'kitchen' | 'wardrobe' | 'bathroom' | 'utility';
export type QuoteModuleGroup =
  | 'base-door'
  | 'base-drawer'
  | 'sink'
  | 'wall-door'
  | 'tall'
  | 'appliance'
  | 'corner'
  | 'open'
  | 'hob'
  | 'pantry'
  | 'wardrobe-hinged'
  | 'wardrobe-drawer'
  | 'wardrobe-open'
  | 'wardrobe-top'
  | 'bathroom-vanity'
  | 'bathroom-wall'
  | 'utility-laundry'
  | 'utility-storage';

export type PresetTranslation = { name:string; description:string };
export type QuoteModulePreset = {
  key:string; family:QuoteModuleFamily; group:QuoteModuleGroup; name:string; description:string; moduleKey:ModuleKey;
  widthMm:number; heightMm:number; depthMm:number; thicknessMm:number; gapMm:number; drawers:number; doors:number; shelfCount:number;
  stretcherDepthMm:number; shelfSetbackMm:number; applianceOpeningHeightMm?:number; frontWidthMm?:number;
  backMode:BackMode; backThicknessMm:number; backInsetMm:number; backGrooveDepthMm:number; frontEdgeIncluded:boolean;
  translations?:Partial<Record<'en'|'cs'|'de'|'pl',PresetTranslation>>;
};

const common={thicknessMm:18,gapMm:2,stretcherDepthMm:100,shelfSetbackMm:20,backThicknessMm:4,backInsetMm:10,backGrooveDepthMm:8,frontEdgeIncluded:true} as const;
const base={...common,family:'kitchen' as const,heightMm:720,depthMm:560} as const;
const wall={...common,family:'kitchen' as const,heightMm:720,depthMm:350,stretcherDepthMm:80,shelfSetbackMm:15} as const;
const tall={...common,family:'kitchen' as const,heightMm:2100,depthMm:560,shelfSetbackMm:20} as const;

function translated(enName:string,enDescription:string,csName:string,csDescription:string,deName:string,deDescription:string,plName:string,plDescription:string){
  return {en:{name:enName,description:enDescription},cs:{name:csName,description:csDescription},de:{name:deName,description:deDescription},pl:{name:plName,description:plDescription}};
}

function baseDoor(widthMm:number):QuoteModulePreset{const doors=widthMm>=700?2:1;return{...base,key:`base-door-${widthMm}`,group:'base-door',name:`Нижний ${widthMm} · ${doors===1?'дверь':'2 двери'}`,description:`Стандартный нижний шкаф ${widthMm} мм, ${doors===1?'одна дверь':'две двери'} и одна полка.`,moduleKey:'b-door',widthMm,drawers:1,doors,shelfCount:1,backMode:'groove'};}
function baseDrawer(widthMm:number,drawers=3):QuoteModulePreset{return{...base,key:`base-drawer-${widthMm}-${drawers}`,group:'base-drawer',name:`Нижний ${widthMm} · ${drawers} ящика`,description:`Нижний модуль ${widthMm} мм с ${drawers} ящиками для быстрого коммерческого расчёта.`,moduleKey:'b-drawer',widthMm,drawers,doors:1,shelfCount:0,backMode:'groove'};}
function sink(widthMm:number):QuoteModulePreset{const doors=widthMm>=600?2:1;return{...base,key:`sink-${widthMm}`,group:'sink',name:`Мойка ${widthMm} · ${doors===1?'дверь':'2 двери'}`,description:`Нижний шкаф под мойку ${widthMm} мм: без полки и без задней стенки.`,moduleKey:'b-door',widthMm,drawers:1,doors,shelfCount:0,backMode:'none'};}
function wallDoor(widthMm:number,heightMm=720):QuoteModulePreset{const doors=widthMm>=700?2:1;return{...wall,key:`wall-door-${widthMm}-${heightMm}`,group:'wall-door',name:`Верхний ${widthMm} × ${heightMm}`,description:`Навесной шкаф ${widthMm} мм, высота ${heightMm} мм, глубина 350 мм.`,moduleKey:'w-door',widthMm,heightMm,drawers:1,doors,shelfCount:heightMm<=400?1:heightMm>=900?3:2,backMode:'groove'};}
function tallDoor(widthMm:number,heightMm=2100,shelfCount=4):QuoteModulePreset{const doors=widthMm>=800?2:1;return{...tall,key:`tall-door-${widthMm}-${heightMm}`,group:'tall',name:`Пенал ${widthMm} × ${heightMm}`,description:`Высокий хозяйственный пенал ${widthMm} мм, высота ${heightMm} мм.`,moduleKey:'t-door',widthMm,heightMm,drawers:1,doors,shelfCount,backMode:'groove'};}
function openWall(widthMm:number):QuoteModulePreset{return{...wall,key:`open-wall-${widthMm}`,group:'open',name:`Открытый верхний ${widthMm}`,description:`Навесной открытый модуль ${widthMm} мм без фасада, с двумя полками.`,moduleKey:'open',widthMm,drawers:1,doors:0,shelfCount:2,backMode:'groove'};}
function openBase(widthMm:number):QuoteModulePreset{return{...base,key:`open-base-${widthMm}`,group:'open',name:`Открытый нижний ${widthMm}`,description:`Нижний открытый модуль ${widthMm} мм без фасада, с одной полкой.`,moduleKey:'open',widthMm,drawers:1,doors:0,shelfCount:1,backMode:'groove'};}
function blindBaseCorner(widthMm:number,frontWidthMm:number):QuoteModulePreset{return{...base,key:`corner-base-blind-${widthMm}`,group:'corner',name:`Угловой нижний ${widthMm} · глухой`,description:`Коммерческий глухой угловой модуль ${widthMm} мм с видимым фасадом ${frontWidthMm} мм. Точная угловая конструкция уточняется в Makster Pro.`,moduleKey:'b-door',widthMm,frontWidthMm,drawers:1,doors:1,shelfCount:1,backMode:'groove'};}
function blindWallCorner(widthMm:number,frontWidthMm:number):QuoteModulePreset{return{...wall,key:`corner-wall-blind-${widthMm}`,group:'corner',name:`Угловой верхний ${widthMm} · глухой`,description:`Коммерческий навесной угловой модуль ${widthMm} мм с видимым фасадом ${frontWidthMm} мм и двумя полками.`,moduleKey:'w-door',widthMm,frontWidthMm,drawers:1,doors:1,shelfCount:2,backMode:'groove'};}
function hobBase(widthMm:number):QuoteModulePreset{const doors=widthMm>=700?2:1;return{...base,key:`hob-base-${widthMm}`,group:'hob',name:`Низ под варочную ${widthMm}`,description:`Нижний шкаф под варочную поверхность ${widthMm} мм без полки в зоне техники.`,moduleKey:'b-door',widthMm,drawers:1,doors,shelfCount:0,backMode:'groove',translations:translated(`Hob base ${widthMm}`,`Base cabinet for a ${widthMm} mm hob zone without an internal shelf.`,`Spodní pod varnou desku ${widthMm}`,`Spodní skříňka ${widthMm} mm pod varnou desku bez vnitřní police.`,`Kochfeld-Unterschrank ${widthMm}`,`Unterschrank ${widthMm} mm für das Kochfeld ohne Innenboden.`,`Dolna pod płytę ${widthMm}`,`Szafka dolna ${widthMm} mm pod płytę grzewczą bez półki.`)};}
function pantry(widthMm:number):QuoteModulePreset{return{...tall,key:`pantry-${widthMm}`,group:'pantry',name:`Пенал-кладовая ${widthMm}`,description:`Высокий пенал ${widthMm} мм с пятью полками для хранения.`,moduleKey:'t-door',widthMm,drawers:1,doors:1,shelfCount:5,backMode:'groove',translations:translated(`Pantry ${widthMm}`,`Tall ${widthMm} mm pantry with five shelves.`,`Potravinová skříň ${widthMm}`,`Vysoká potravinová skříň ${widthMm} mm s pěti policemi.`,`Vorratsschrank ${widthMm}`,`Hoher Vorratsschrank ${widthMm} mm mit fünf Böden.`,`Spiżarnia ${widthMm}`,`Wysoki słupek ${widthMm} mm z pięcioma półkami.`)};}

const appliancePresets:QuoteModulePreset[]=[
  {...base,key:'base-oven-600',group:'appliance',name:'Духовка нижняя 600',description:'Нижний корпус 600 мм под встроенную духовку. Фасад техники не считается мебельным фасадом.',moduleKey:'b-oven',widthMm:600,drawers:1,doors:0,shelfCount:0,applianceOpeningHeightMm:600,backMode:'none'},
  {...base,key:'dishwasher-450',group:'appliance',name:'ПММ 450 · фасад',description:'Встроенная посудомоечная машина 450 мм: считается мебельный фасад без отдельного корпуса.',moduleKey:'dishwasher',widthMm:450,drawers:1,doors:1,shelfCount:0,backMode:'none'},
  {...base,key:'dishwasher-600',group:'appliance',name:'ПММ 600 · фасад',description:'Встроенная посудомоечная машина 600 мм: считается мебельный фасад без отдельного корпуса.',moduleKey:'dishwasher',widthMm:600,drawers:1,doors:1,shelfCount:0,backMode:'none'},
  {...tall,key:'tall-oven-600',group:'appliance',name:'Пенал духовки 600',description:'Высокий пенал 600 мм с центральным проёмом 600 мм под духовку и мебельными фасадами сверху/снизу.',moduleKey:'t-oven',widthMm:600,drawers:1,doors:2,shelfCount:2,applianceOpeningHeightMm:600,backMode:'none'},
  {...tall,key:'tall-microwave-600',group:'appliance',name:'Пенал микроволновки 600',description:'Высокий пенал 600 мм с центральным проёмом 450 мм под микроволновую печь.',moduleKey:'t-oven',widthMm:600,drawers:1,doors:2,shelfCount:3,applianceOpeningHeightMm:450,backMode:'none',translations:translated('Tall microwave 600','Tall 600 mm cabinet with a 450 mm appliance opening.','Vysoká mikrovlnka 600','Vysoká skříň 600 mm s otvorem 450 mm pro mikrovlnku.','Mikrowellen-Hochschrank 600','Hochschrank 600 mm mit 450-mm-Gerätenische.','Słupek mikrofalówka 600','Słupek 600 mm z wnęką 450 mm na mikrofalówkę.')},
  {...tall,key:'tall-oven-micro-600',group:'appliance',name:'Пенал духовка + СВЧ 600',description:'Высокий пенал 600 мм с общей зоной техники 1050 мм под духовку и СВЧ.',moduleKey:'t-oven',widthMm:600,drawers:1,doors:2,shelfCount:2,applianceOpeningHeightMm:1050,backMode:'none',translations:translated('Tall oven + microwave 600','Tall 600 mm cabinet with a 1050 mm combined appliance zone.','Vysoká trouba + mikrovlnka 600','Vysoká skříň 600 mm se společnou zónou spotřebičů 1050 mm.','Hochschrank Backofen + Mikrowelle 600','Hochschrank 600 mm mit 1050-mm-Gerätezone.','Słupek piekarnik + mikrofalówka 600','Słupek 600 mm ze strefą AGD 1050 mm.')},
  {...tall,key:'tall-coffee-600',group:'appliance',name:'Пенал кофемашины 600',description:'Высокий пенал 600 мм с проёмом 450 мм под встроенную кофемашину.',moduleKey:'t-oven',widthMm:600,drawers:1,doors:2,shelfCount:3,applianceOpeningHeightMm:450,backMode:'none',translations:translated('Tall coffee machine 600','Tall 600 mm cabinet with a 450 mm built-in coffee machine opening.','Vysoká kávovar 600','Vysoká skříň 600 mm s otvorem 450 mm pro vestavný kávovar.','Kaffeemaschinen-Hochschrank 600','Hochschrank 600 mm mit 450-mm-Nische für Einbau-Kaffeemaschine.','Słupek ekspres 600','Słupek 600 mm z wnęką 450 mm na ekspres do zabudowy.')},
  {...tall,depthMm:600,key:'tall-fridge-600',group:'appliance',name:'Пенал холодильника 600',description:'Высокий пенал 600 мм под встроенный холодильник, два мебельных фасада, без задней стенки.',moduleKey:'t-fridge',widthMm:600,drawers:1,doors:2,shelfCount:1,backMode:'none'},
];

function wardrobeHinged(key:string,name:string,widthMm:number,shelfCount:number,description:string,translation:QuoteModulePreset['translations']):QuoteModulePreset{return{...common,family:'wardrobe',group:'wardrobe-hinged',key,name,description,moduleKey:'t-door',widthMm,heightMm:2400,depthMm:600,drawers:1,doors:widthMm>=900?2:1,shelfCount,backMode:'groove',translations:translation};}
function wardrobeDrawer(widthMm:number,drawers:number):QuoteModulePreset{return{...common,family:'wardrobe',group:'wardrobe-drawer',key:`wardrobe-drawer-${widthMm}-${drawers}`,name:`Гардероб · ${drawers} ящика ${widthMm}`,description:`Низкая секция гардероба ${widthMm} мм с ${drawers} выдвижными ящиками.`,moduleKey:'b-drawer',widthMm,heightMm:720,depthMm:560,drawers,doors:0,shelfCount:0,backMode:'groove',translations:translated(`Wardrobe ${drawers} drawers ${widthMm}`,`Low wardrobe section ${widthMm} mm with ${drawers} drawers.`,`Šatna · ${drawers} zásuvky ${widthMm}`,`Nízká šatní sekce ${widthMm} mm s ${drawers} zásuvkami.`,`Garderobe · ${drawers} Schubladen ${widthMm}`,`Niedrige Garderobensektion ${widthMm} mm mit ${drawers} Schubladen.`,`Garderoba · ${drawers} szuflady ${widthMm}`,`Niska sekcja garderoby ${widthMm} mm z ${drawers} szufladami.`)};}
function wardrobeOpen(widthMm:number,shelves:number):QuoteModulePreset{return{...common,family:'wardrobe',group:'wardrobe-open',key:`wardrobe-open-${widthMm}-${shelves}`,name:`Гардероб открытый ${widthMm} · ${shelves} полок`,description:`Открытая гардеробная секция ${widthMm} мм без фасада.`,moduleKey:'open',widthMm,heightMm:2400,depthMm:600,drawers:0,doors:0,shelfCount:shelves,backMode:'groove',translations:translated(`Open wardrobe ${widthMm}`,`Open ${widthMm} mm wardrobe section with ${shelves} shelves.`,`Otevřená šatna ${widthMm}`,`Otevřená šatní sekce ${widthMm} mm s ${shelves} policemi.`,`Offene Garderobe ${widthMm}`,`Offene Garderobensektion ${widthMm} mm mit ${shelves} Böden.`,`Garderoba otwarta ${widthMm}`,`Otwarta sekcja garderoby ${widthMm} mm z ${shelves} półkami.`)};}
function wardrobeTop(widthMm:number):QuoteModulePreset{return{...common,family:'wardrobe',group:'wardrobe-top',key:`wardrobe-top-${widthMm}`,name:`Антресоль ${widthMm}`,description:`Верхняя антресольная секция ${widthMm} мм, высота 400 мм.`,moduleKey:'w-door',widthMm,heightMm:400,depthMm:600,drawers:0,doors:widthMm>=900?2:1,shelfCount:0,backMode:'groove',translations:translated(`Top cabinet ${widthMm}`,`Wardrobe top cabinet ${widthMm} mm, 400 mm high.`,`Nástavec ${widthMm}`,`Horní šatní nástavec ${widthMm} mm, výška 400 mm.`,`Aufsatzschrank ${widthMm}`,`Garderoben-Aufsatz ${widthMm} mm, 400 mm hoch.`,`Nadstawka ${widthMm}`,`Nadstawka garderoby ${widthMm} mm, wysokość 400 mm.`)};}

const wardrobePresets:QuoteModulePreset[]=[
  wardrobeHinged('wardrobe-long-600','Гардероб · длинная одежда 600',600,1,'Секция 600 мм под длинную одежду: верхняя полка и зона штанги.',translated('Wardrobe long hanging 600','600 mm section for long clothes with top shelf and hanging zone.','Šatna dlouhé oděvy 600','Sekce 600 mm pro dlouhé oděvy s horní policí a tyčí.','Garderobe lange Kleidung 600','600-mm-Sektion für lange Kleidung mit oberem Boden und Kleiderstange.','Garderoba długie ubrania 600','Sekcja 600 mm na długie ubrania z górną półką i drążkiem.')),
  wardrobeHinged('wardrobe-long-900','Гардероб · длинная одежда 900',900,1,'Широкая секция 900 мм под длинную одежду.',translated('Wardrobe long hanging 900','Wide 900 mm section for long clothes.','Šatna dlouhé oděvy 900','Široká sekce 900 mm pro dlouhé oděvy.','Garderobe lange Kleidung 900','Breite 900-mm-Sektion für lange Kleidung.','Garderoba długie ubrania 900','Szeroka sekcja 900 mm na długie ubrania.')),
  wardrobeHinged('wardrobe-short-600','Гардероб · короткая одежда 600',600,2,'Секция 600 мм под короткую одежду с верхней и разделительной полкой.',translated('Wardrobe short hanging 600','600 mm short-clothes section with top and divider shelves.','Šatna krátké oděvy 600','Sekce 600 mm pro krátké oděvy s horní a dělicí policí.','Garderobe kurze Kleidung 600','600-mm-Sektion für kurze Kleidung mit oberem und Trennboden.','Garderoba krótkie ubrania 600','Sekcja 600 mm na krótkie ubrania z górną i dzielącą półką.')),
  wardrobeHinged('wardrobe-shelves-600','Гардероб · полки 600',600,5,'Полочная секция 600 мм с пятью полками.',translated('Wardrobe shelves 600','600 mm wardrobe section with five shelves.','Šatna police 600','Šatní sekce 600 mm s pěti policemi.','Garderobe Böden 600','600-mm-Garderobensektion mit fünf Böden.','Garderoba półki 600','Sekcja garderoby 600 mm z pięcioma półkami.')),
  wardrobeHinged('wardrobe-shoes-600','Гардероб · обувь 600',600,6,'Секция 600 мм с шестью полками для обуви.',translated('Wardrobe shoes 600','600 mm shoe section with six shelves.','Šatna boty 600','Sekce 600 mm se šesti policemi na boty.','Garderobe Schuhe 600','600-mm-Schuhsektion mit sechs Böden.','Garderoba buty 600','Sekcja 600 mm z sześcioma półkami na buty.')),
  ...[600,800].flatMap((width)=>[wardrobeDrawer(width,3),wardrobeDrawer(width,4)]),
  wardrobeOpen(600,5),wardrobeOpen(900,5),wardrobeTop(600),wardrobeTop(900),
];

function bathroomVanity(widthMm:number,drawers:number):QuoteModulePreset{const drawerMode=drawers>0;return{...common,family:'bathroom',group:'bathroom-vanity',key:`bathroom-vanity-${widthMm}-${drawerMode?`${drawers}d`:'doors'}`,name:`Тумба под раковину ${widthMm} · ${drawerMode?`${drawers} ящика`:'двери'}`,description:`Подвесная тумба ${widthMm} мм, высота 560 мм, глубина 480 мм, без задней стенки для коммуникаций.`,moduleKey:drawerMode?'b-drawer':'b-door',widthMm,heightMm:560,depthMm:480,drawers:drawerMode?drawers:0,doors:drawerMode?0:(widthMm>=700?2:1),shelfCount:0,backMode:'none',translations:translated(`Vanity ${widthMm} · ${drawerMode?`${drawers} drawers`:'doors'}`,`Wall-hung vanity ${widthMm} mm, 560 mm high, 480 mm deep, open back for services.`,`Skříňka pod umyvadlo ${widthMm}`,`Závěsná skříňka ${widthMm} mm, výška 560 mm, hloubka 480 mm, bez zad pro instalace.`,`Waschtischunterschrank ${widthMm}`,`Hängender Waschtischunterschrank ${widthMm} mm, 560 mm hoch, 480 mm tief, ohne Rückwand.`,`Szafka pod umywalkę ${widthMm}`,`Wisząca szafka ${widthMm} mm, wysokość 560 mm, głębokość 480 mm, bez pleców.`)};}
function bathroomWall(widthMm:number,heightMm:number,depthMm:number):QuoteModulePreset{return{...common,family:'bathroom',group:'bathroom-wall',key:`bathroom-wall-${widthMm}-${heightMm}`,name:`Ванная · навесной ${widthMm} × ${heightMm}`,description:`Навесной шкаф ванной ${widthMm} мм, высота ${heightMm} мм.`,moduleKey:'w-door',widthMm,heightMm,depthMm,drawers:0,doors:widthMm>=700?2:1,shelfCount:heightMm>1000?4:2,backMode:'groove',translations:translated(`Bathroom wall ${widthMm} × ${heightMm}`,`Bathroom wall cabinet ${widthMm} mm wide and ${heightMm} mm high.`,`Koupelna horní ${widthMm} × ${heightMm}`,`Koupelnová závěsná skříňka ${widthMm} mm, výška ${heightMm} mm.`,`Bad-Hängeschrank ${widthMm} × ${heightMm}`,`Bad-Hängeschrank ${widthMm} mm breit und ${heightMm} mm hoch.`,`Łazienka wisząca ${widthMm} × ${heightMm}`,`Wisząca szafka łazienkowa ${widthMm} mm, wysokość ${heightMm} mm.`)};}
const bathroomPresets:QuoteModulePreset[]=[bathroomVanity(600,2),bathroomVanity(800,2),bathroomVanity(1000,2),bathroomVanity(600,0),bathroomVanity(800,0),bathroomWall(400,1600,350),bathroomWall(600,700,180),bathroomWall(800,700,180)];

function laundryOpen(key:string,name:string,widthMm:number,heightMm:number,description:string,translation:QuoteModulePreset['translations']):QuoteModulePreset{return{...common,family:'utility',group:'utility-laundry',key,name,description,moduleKey:'open',widthMm,heightMm,depthMm:650,drawers:0,doors:0,shelfCount:0,backMode:'none',translations:translation};}
const utilityPresets:QuoteModulePreset[]=[
  laundryOpen('utility-washer-650','Ниша стиральной машины 650',650,900,'Открытая ниша 650 мм под стиральную машину.',translated('Washer niche 650','Open 650 mm niche for a washing machine.','Nika pračka 650','Otevřená nika 650 mm pro pračku.','Waschmaschinen-Nische 650','Offene 650-mm-Nische für die Waschmaschine.','Wnęka pralka 650','Otwarta wnęka 650 mm na pralkę.')),
  laundryOpen('utility-washer-dryer-650','Колонна стиральная + сушильная 650',650,1850,'Открытая высокая ниша под стиральную и сушильную машину в колонне.',translated('Washer + dryer column 650','Tall open niche for stacked washer and dryer.','Sloupec pračka + sušička 650','Vysoká otevřená nika pro pračku a sušičku ve sloupci.','Wasch-/Trocknersäule 650','Hohe offene Nische für Waschmaschine und Trockner übereinander.','Kolumna pralka + suszarka 650','Wysoka otwarta wnęka na pralkę i suszarkę w słupku.')),
  {...common,family:'utility',group:'utility-storage',key:'utility-cleaning-600',name:'Хозяйственный шкаф 600',description:'Высокий хозяйственный шкаф 600 мм для уборочного инвентаря.',moduleKey:'t-door',widthMm:600,heightMm:2100,depthMm:600,drawers:0,doors:1,shelfCount:4,backMode:'groove',translations:translated('Cleaning cabinet 600','Tall 600 mm utility cabinet for cleaning equipment.','Úklidová skříň 600','Vysoká užitková skříň 600 mm na úklidové vybavení.','Putzschrank 600','Hoher 600-mm-Haushaltsschrank für Reinigungsgeräte.','Szafa gospodarcza 600','Wysoka szafa 600 mm na sprzęt do sprzątania.')},
  {...common,family:'utility',group:'utility-storage',key:'utility-storage-800',name:'Хозяйственный шкаф 800',description:'Широкий хозяйственный шкаф 800 мм с пятью полками.',moduleKey:'t-door',widthMm:800,heightMm:2100,depthMm:600,drawers:0,doors:2,shelfCount:5,backMode:'groove',translations:translated('Utility storage 800','Wide 800 mm utility cabinet with five shelves.','Užitková skříň 800','Široká užitková skříň 800 mm s pěti policemi.','Haushaltsschrank 800','Breiter 800-mm-Haushaltsschrank mit fünf Böden.','Szafa gospodarcza 800','Szeroka szafa 800 mm z pięcioma półkami.')},
];

export const QUOTE_MODULE_PRESETS:QuoteModulePreset[]=[
  ...[300,400,450,500,600,800,900].map(baseDoor),
  ...[400,450,500,600,800,900].map((width)=>baseDrawer(width,3)),baseDrawer(600,2),baseDrawer(800,2),baseDrawer(600,4),baseDrawer(800,4),
  ...[600,800,900].map(sink),
  ...[300,400,450,500,600,800,900].map((width)=>wallDoor(width,720)),wallDoor(600,360),wallDoor(800,360),wallDoor(900,360),wallDoor(600,900),wallDoor(800,900),
  ...[450,600,900].map((width)=>tallDoor(width)),
  ...[600,800,900].map(hobBase),
  ...[300,400,450,600].map(pantry),
  ...appliancePresets,
  blindBaseCorner(900,450),blindBaseCorner(1000,500),blindWallCorner(650,400),
  ...[300,600,800].map(openWall),openBase(300),openBase(600),
  ...wardrobePresets,
  ...bathroomPresets,
  ...utilityPresets,
];

export function quoteModulePreset(key:string){return QUOTE_MODULE_PRESETS.find((preset)=>preset.key===key)??null;}
