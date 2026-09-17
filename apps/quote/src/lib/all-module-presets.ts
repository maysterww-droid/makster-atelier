import { QUOTE_MODULE_PRESETS, type QuoteModulePreset } from './module-presets';
import { SPECIAL_HARDWARE_PRESETS } from './special-hardware-presets';

export const ALL_QUOTE_MODULE_PRESETS:QuoteModulePreset[]=[
  ...QUOTE_MODULE_PRESETS.filter((preset)=>!SPECIAL_HARDWARE_PRESETS.some((special)=>special.key===preset.key)),
  ...SPECIAL_HARDWARE_PRESETS,
];
