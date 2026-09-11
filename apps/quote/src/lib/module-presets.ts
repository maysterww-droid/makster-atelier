import type { BackMode, ModuleKey } from './engineering';

export type QuoteModulePreset = {
  key: string;
  group: 'base-door' | 'base-drawer' | 'sink';
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
  backMode: BackMode;
  backThicknessMm: number;
  backInsetMm: number;
  backGrooveDepthMm: number;
  frontEdgeIncluded: boolean;
};

const base = {
  heightMm: 720,
  depthMm: 560,
  thicknessMm: 18,
  gapMm: 2,
  stretcherDepthMm: 100,
  shelfSetbackMm: 20,
  backThicknessMm: 4,
  backInsetMm: 10,
  backGrooveDepthMm: 8,
  frontEdgeIncluded: true,
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

export const QUOTE_MODULE_PRESETS: QuoteModulePreset[] = [
  ...[300, 400, 450, 500, 600, 800, 900].map(baseDoor),
  ...[400, 450, 500, 600, 800, 900].map((width) => baseDrawer(width, 3)),
  baseDrawer(600, 2),
  baseDrawer(800, 2),
  ...[600, 800, 900].map(sink),
];

export function quoteModulePreset(key: string) {
  return QUOTE_MODULE_PRESETS.find((preset) => preset.key === key) ?? null;
}
