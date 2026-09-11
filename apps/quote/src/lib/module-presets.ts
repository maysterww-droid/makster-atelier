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

export const QUOTE_MODULE_PRESETS: QuoteModulePreset[] = [
  {
    ...base,
    key: 'base-door-450',
    group: 'base-door',
    name: 'Нижний 450 · дверь',
    description: 'Базовый нижний шкаф шириной 450 мм, одна дверь и одна полка.',
    moduleKey: 'b-door',
    widthMm: 450,
    drawers: 1,
    doors: 1,
    shelfCount: 1,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'base-door-600',
    group: 'base-door',
    name: 'Нижний 600 · дверь',
    description: 'Базовый нижний шкаф шириной 600 мм, одна дверь и одна полка.',
    moduleKey: 'b-door',
    widthMm: 600,
    drawers: 1,
    doors: 1,
    shelfCount: 1,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'base-door-800',
    group: 'base-door',
    name: 'Нижний 800 · 2 двери',
    description: 'Широкий нижний шкаф 800 мм с двумя фасадами и одной полкой.',
    moduleKey: 'b-door',
    widthMm: 800,
    drawers: 1,
    doors: 2,
    shelfCount: 1,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'base-drawer-450-3',
    group: 'base-drawer',
    name: 'Нижний 450 · 3 ящика',
    description: 'Узкий нижний модуль 450 мм с тремя одинаково рассчитанными фасадами ящиков.',
    moduleKey: 'b-drawer',
    widthMm: 450,
    drawers: 3,
    doors: 1,
    shelfCount: 0,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'base-drawer-600-3',
    group: 'base-drawer',
    name: 'Нижний 600 · 3 ящика',
    description: 'Стандартный нижний модуль 600 мм с тремя ящиками.',
    moduleKey: 'b-drawer',
    widthMm: 600,
    drawers: 3,
    doors: 1,
    shelfCount: 0,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'base-drawer-800-3',
    group: 'base-drawer',
    name: 'Нижний 800 · 3 ящика',
    description: 'Широкий нижний модуль 800 мм с тремя ящиками.',
    moduleKey: 'b-drawer',
    widthMm: 800,
    drawers: 3,
    doors: 1,
    shelfCount: 0,
    backMode: 'groove',
  },
  {
    ...base,
    key: 'sink-600',
    group: 'sink',
    name: 'Мойка 600 · 2 двери',
    description: 'Нижний шкаф под мойку 600 мм: две двери, без полки и без задней стенки.',
    moduleKey: 'b-door',
    widthMm: 600,
    drawers: 1,
    doors: 2,
    shelfCount: 0,
    backMode: 'none',
  },
  {
    ...base,
    key: 'sink-800',
    group: 'sink',
    name: 'Мойка 800 · 2 двери',
    description: 'Нижний шкаф под мойку 800 мм: две двери, без полки и без задней стенки.',
    moduleKey: 'b-door',
    widthMm: 800,
    drawers: 1,
    doors: 2,
    shelfCount: 0,
    backMode: 'none',
  },
];

export function quoteModulePreset(key: string) {
  return QUOTE_MODULE_PRESETS.find((preset) => preset.key === key) ?? null;
}
