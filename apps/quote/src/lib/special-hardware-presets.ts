import { QUOTE_MODULE_PRESETS, type QuoteModulePreset } from './module-presets';

export type SpecialHardwareRole = 'cargo' | 'lift' | 'corner';
export type SpecialHardwarePreset = QuoteModulePreset & {
  specialHardwareRole: SpecialHardwareRole;
  specialHardwareQty: number;
};

const common={thicknessMm:18,gapMm:2,stretcherDepthMm:100,shelfSetbackMm:20,backThicknessMm:4,backInsetMm:10,backGrooveDepthMm:8,frontEdgeIncluded:true} as const;
const base={...common,family:'kitchen' as const,heightMm:720,depthMm:560} as const;
const wall={...common,family:'kitchen' as const,heightMm:720,depthMm:350,stretcherDepthMm:80,shelfSetbackMm:15} as const;

function cargo(widthMm:number):SpecialHardwarePreset{return{...base,key:`cargo-${widthMm}`,group:'base-door',name:`Карго ${widthMm}`,description:`Нижний выдвижной модуль ${widthMm} мм под бутылочницу / cargo. Механизм считается отдельной специальной фурнитурой.`,moduleKey:'b-door',widthMm,drawers:0,doors:1,shelfCount:0,backMode:'groove',specialHardwareRole:'cargo',specialHardwareQty:1,translations:{en:{name:`Cargo pull-out ${widthMm}`,description:`Base pull-out ${widthMm} mm for a bottle/cargo mechanism. The mechanism is costed as special hardware.`},cs:{name:`Cargo výsuv ${widthMm}`,description:`Spodní výsuvný modul ${widthMm} mm pro cargo mechanismus. Mechanismus se počítá jako speciální kování.`},de:{name:`Cargo-Auszug ${widthMm}`,description:`Ausziehbarer Unterschrank ${widthMm} mm für Cargo-/Flaschenauszug. Der Beschlag wird separat kalkuliert.`},pl:{name:`Cargo ${widthMm}`,description:`Dolny wysuwany moduł ${widthMm} mm pod cargo. Mechanizm jest liczony jako specjalne okucie.`}}};}
function lift(widthMm:number,heightMm=720):SpecialHardwarePreset{return{...wall,key:`lift-wall-${widthMm}-${heightMm}`,group:'wall-door',name:`Верхний Lift-Up ${widthMm} × ${heightMm}`,description:`Навесной шкаф с подъёмным фасадом. Подъёмник типа Aventos считается отдельной специальной фурнитурой.`,moduleKey:'w-door',widthMm,heightMm,drawers:0,doors:1,shelfCount:heightMm>=720?2:1,backMode:'groove',specialHardwareRole:'lift',specialHardwareQty:1,translations:{en:{name:`Lift-up wall ${widthMm} × ${heightMm}`,description:'Wall cabinet with lift-up front. Aventos-type lift mechanism is costed as special hardware.'},cs:{name:`Horní Lift-Up ${widthMm} × ${heightMm}`,description:'Horní skříňka s výklopným čelem. Mechanismus typu Aventos se počítá jako speciální kování.'},de:{name:`Lift-Up Oberschrank ${widthMm} × ${heightMm}`,description:'Oberschrank mit Klappenfront. Aventos-artiger Klappenbeschlag wird separat kalkuliert.'},pl:{name:`Górna Lift-Up ${widthMm} × ${heightMm}`,description:'Szafka górna z frontem podnoszonym. Mechanizm typu Aventos jest liczony jako specjalne okucie.'}}};}
function cornerMechanism(key:string,name:string,widthMm:number,frontWidthMm:number):SpecialHardwarePreset{return{...base,key,group:'corner',name,description:`Угловой нижний модуль ${widthMm} мм со специальным механизмом. Механизм считается отдельной фурнитурой; точная присадка остаётся в Makster Pro.`,moduleKey:'b-door',widthMm,frontWidthMm,drawers:0,doors:1,shelfCount:1,backMode:'groove',specialHardwareRole:'corner',specialHardwareQty:1,translations:{en:{name,description:`${widthMm} mm base corner cabinet with a special corner mechanism. Hardware is costed separately; exact drilling stays in Makster Pro.`},cs:{name,description:`Rohová spodní skříň ${widthMm} mm se speciálním rohovým mechanismem. Kování se počítá samostatně.`},de:{name,description:`${widthMm}-mm-Eckunterschrank mit speziellem Eckmechanismus. Beschlag wird separat kalkuliert.`},pl:{name,description:`Dolny narożnik ${widthMm} mm ze specjalnym mechanizmem narożnym. Okucie jest liczone osobno.`}}};}

export const SPECIAL_HARDWARE_PRESETS:SpecialHardwarePreset[]=[
  cargo(150),cargo(200),cargo(300),
  lift(600,360),lift(600,720),lift(800,720),lift(900,720),
  cornerMechanism('corner-lemans-900','LeMans 900',900,450),
  cornerMechanism('corner-lemans-1000','LeMans 1000',1000,500),
  cornerMechanism('corner-magic-900','Magic Corner 900',900,450),
  cornerMechanism('corner-magic-1000','Magic Corner 1000',1000,500),
];

for(const preset of SPECIAL_HARDWARE_PRESETS){if(!QUOTE_MODULE_PRESETS.some((item)=>item.key===preset.key))QUOTE_MODULE_PRESETS.push(preset);}

export function specialHardwarePreset(key:string){return SPECIAL_HARDWARE_PRESETS.find((preset)=>preset.key===key)??null;}
export function isSpecialHardwarePreset(preset:QuoteModulePreset):preset is SpecialHardwarePreset{return 'specialHardwareRole' in preset && 'specialHardwareQty' in preset;}
