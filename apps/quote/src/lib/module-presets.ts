import type { BackMode, ModuleKey } from './engineering';

export type QuoteModuleGroup =
  | 'base-door'
  | 'base-drawer'
  | 'sink'
  | 'wall-door'
  | 'tall'
  | 'appliance'
  | 'open';

export type QuoteModulePreset = {
  key: string;
  group: QuoteModuleGroup;
  name: string;
  description: string;
  moduleKey: ModuleKey;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  gapMm: number;
  drawers: number;
  doors: number;
  shelfCount: number;
  stretcherDepthMm: number;
  shelfSetbackMm: number;
  applianceOpeningHeightMm?: number;
  backMode: BackMode;
  backThicknessMm: number;
  backInsetMm: number;
  backGrooveDepthMm: number;
  frontEdgeIncluded: boolean;
};

const common = {
  thicknessMm: 18,
  gapMm: 2,
  stretcherDepthMm: 100,
  shelfSetbackMm: 20,
  backThicknessMm: 4,
  backInsetMm: 10,
  backGrooveDepthMm: 8,
  frontEdgeIncluded: true,
} as const;

const base = {
  ...common,
  heightMm: 720,
  depthMm: 560,
} as const;

const wall = {
  ...common,
  heightMm: 720,
  depthMm: 350,
  stretcherDepthMm: 80,
  shelfSetbackMm: 15,
} as const;

const tall = {
  ...common,
  heightMm: 2100,
  depthMm: 560,
  shelfSetbackMm: 20,
} as const;

function baseDoor(widthMm: number): QuoteModulePreset {
  const doors = widthMm >= 700 ? 2 : 1;
  return {
    ...base,
    key: `base-door-${widthMm}`,
    group: 'base-door',
    name: `Нижний ${widthMm} · ${doors === 1 ? 'дверь' : '2 двери'}`,
    description: `Стандартный нижний шкаф ${widthMm} мм, ${doors === 1 ? 'одна дверь' : 'две двери'} и одна полка.`,
    moduleKey: 'b-door',
    widthMm,
    drawers: 1,
    doors,
    shelfCount: 1,
    backMode: 'groove',
  };
}

function baseDrawer(widthMm: number, drawers = 3): QuoteModulePreset {
  return {
    ...base,
    key: `base-drawer-${widthMm}-${drawers}`,
    group: 'base-drawer',
    name: `Нижний ${widthMm} · ${drawers} ящика`,
    description: `Нижний модуль ${widthMm} мм с ${drawers} ящиками для быстрого коммерческого расчёта.`,
    moduleKey: 'b-drawer',
    widthMm,
    drawers,
    doors: 1,
    shelfCount: 0,
    backMode: 'groove',
  };
}

function sink(widthMm: number): QuoteModulePreset {
  const doors = widthMm >= 600 ? 2 : 1;
  return {
    ...base,
    key: `sink-${widthMm}`,
    group: 'sink',
    name: `Мойка ${widthMm} · ${doors === 1 ? 'дверь' : '2 двери'}`,
    description: `Нижний шкаф под мойку ${widthMm} мм: без полки и без задней стенки.`,
    moduleKey: 'b-door',
    widthMm,
    drawers: 1,
    doors,
    shelfCount: 0,
    backMode: 'none',
  };
}

function wallDoor(widthMm: number): QuoteModulePreset {
  const doors = widthMm >= 700 ? 2 : 1;
  return {
    ...wall,
    key: `wall-door-${widthMm}`,
    group: 'wall-door',
    name: `Верхний ${widthMm} · ${doors === 1 ? 'дверь' : '2 двери'}`,
    description: `Навесной шкаф ${widthMm} мм, высота 720 мм, глубина 350 мм, две полки.`,
    moduleKey: 'w-door',
    widthMm,
    drawers: 1,
    doors,
    shelfCount: 2,
    backMode: 'groove',
  };
}

function tallDoor(widthMm: number): QuoteModulePreset {
  const doors = widthMm >= 800 ? 2 : 1;
  return {
    ...tall,
    key: `tall-door-${widthMm}`,
    group: 'tall',
    name: `Пенал ${widthMm} · ${doors === 1 ? 'дверь' : '2 двери'}`,
    description: `Высокий хозяйственный пенал ${widthMm} мм, высота 2100 мм, четыре полки.`,
    moduleKey: 't-door',
    widthMm,
    drawers: 1,
    doors,
    shelfCount: 4,
    backMode: 'groove',
  };
}

function openWall(widthMm: number): QuoteModulePreset {
  return {
    ...wall,
    key: `open-wall-${widthMm}`,
    group: 'open',
    name: `Открытый верхний ${widthMm}`,
    description: `Навесной открытый модуль ${widthMm} мм без фасада, с двумя полками.`,
    moduleKey: 'open',
    widthMm,
    drawers: 1,
    doors: 0,
    shelfCount: 2,
    backMode: 'groove',
  };
}

function openBase(widthMm: number): QuoteModulePreset {
  return {
    ...base,
    key: `open-base-${widthMm}`,
    group: 'open',
    name: `Открытый нижний ${widthMm}`,
    description: `Нижний открытый модуль ${widthMm} мм без фасада, с одной полкой.`,
    moduleKey: 'open',
    widthMm,
    drawers: 1,
    doors: 0,
    shelfCount: 1,
    backMode: 'groove',
  };
}

const appliancePresets: QuoteModulePreset[] = [
  {
    ...base,
    key: 'base-oven-600',
    group: 'appliance',
    name: 'Духовка нижняя 600',
    description: 'Нижний корпус 600 мм под встроенную духовку. Фасад техники не считается мебельным фасадом.',
    moduleKey: 'b-oven',
    widthMm: 600,
    drawers: 1,
    doors: 0,
    shelfCount: 0,
    applianceOpeningHeightMm: 600,
    backMode: 'none',
  },
  {
    ...base,
    key: 'dishwasher-450',
    group: 'appliance',
    name: 'ПММ 450 · фасад',
    description: 'Встроенная посудомоечная машина 450 мм: считается мебельный фасад без отдельного корпуса.',
    moduleKey: 'dishwasher',
    widthMm: 450,
    drawers: 1,
    doors: 1,
    shelfCount: 0,
    backMode: 'none',
  },
  {
    ...base,
    key: 'dishwasher-600',
    group: 'appliance',
    name: 'ПММ 600 · фасад',
    description: 'Встроенная посудомоечная машина 600 мм: считается мебельный фасад без отдельного корпуса.',
    moduleKey: 'dishwasher',
    widthMm: 600,
    drawers: 1,
    doors: 1,
    shelfCount: 0,
    backMode: 'none',
  },
  {
    ...tall,
    key: 'tall-oven-600',
    group: 'appliance',
    name: 'Пенал духовки 600',
    description: 'Высокий пенал 600 мм с центральным проёмом 600 мм под духовку и мебельными фасадами сверху/снизу.',
    moduleKey: 't-oven',
    widthMm: 600,
    drawers: 1,
    doors: 2,
    shelfCount: 2,
    applianceOpeningHeightMm: 600,
    backMode: 'none',
  },
  {
    ...tall,
    depthMm: 600,
    key: 'tall-fridge-600',
    group: 'appliance',
    name: 'Пенал холодильника 600',
    description: 'Высокий пенал 600 мм под встроенный холодильник, два мебельных фасада, без задней стенки.',
    moduleKey: 't-fridge',
    widthMm: 600,
    drawers: 1,
    doors: 2,
    shelfCount: 1,
    backMode: 'none',
  },
];

export const QUOTE_MODULE_PRESETS: QuoteModulePreset[] = [
  ...[300, 400, 450, 500, 600, 800, 900].map(baseDoor),
  ...[400, 450, 500, 600, 800, 900].map((width) => baseDrawer(width, 3)),
  baseDrawer(600, 2),
  baseDrawer(800, 2),
  ...[600, 800, 900].map(sink),
  ...[300, 400, 450, 500, 600, 800, 900].map(wallDoor),
  ...[450, 600, 900].map(tallDoor),
  ...appliancePresets,
  ...[300, 600, 800].map(openWall),
  openBase(300),
  openBase(600),
];

export function quoteModulePreset(key: string) {
  return QUOTE_MODULE_PRESETS.find((preset) => preset.key === key) ?? null;
}
