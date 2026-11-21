import { mm, type FurnitureItem, type FurnitureModule, type FrontSpec, type KitchenModuleType, type Mm10 } from '../../project-model/src/types.js';
import { KITCHEN_MODULE_LIBRARY, type KitchenLibraryModuleId } from './kitchen-module-library.js';

export interface KitchenRunRequirement {
  libraryModuleId: KitchenLibraryModuleId;
  count?: number;
  /** Exact production width in millimetres. When omitted, Composer uses the library-aware preferred width. */
  widthMm?: number;
  /** Optional lower/upper limits used when selecting a standard width. */
  minWidthMm?: number;
  maxWidthMm?: number;
  name?: string;
}

export interface KitchenRunComposerInput {
  runId: string;
  widthMm: number;
  type?: KitchenModuleType;
  requirements?: KitchenRunRequirement[];
  /** Standard carcass widths available to the workshop / supplier. */
  standardWidthsMm?: number[];
  /** Deliberate site-fit fillers at the ends of the run. */
  leftFillerMm?: number;
  rightFillerMm?: number;
  /** Library module used for automatic capacity filling. */
  fillModuleId?: KitchenLibraryModuleId;
  /** Minimum sensible width for an automatically generated storage module. */
  minimumFillModuleMm?: number;
  /** If false, all unallocated width becomes one technical section. */
  fillRemainingWithCabinets?: boolean;
}

export interface KitchenRunPlacement {
  index: number;
  module: FurnitureModule;
  xMm: number;
  widthMm: number;
  source: 'required' | 'auto_fill' | 'technical_fill';
}

export interface KitchenRunComposeIssue {
  code: 'RUN_WIDTH_INVALID' | 'RUN_REQUIREMENTS_OVERFLOW' | 'MODULE_TYPE_MISMATCH' | 'FILL_WIDTH_BELOW_MINIMUM';
  severity: 'warning' | 'blocking';
  message: string;
}

export interface KitchenRunComposeResult {
  runId: string;
  requestedWidthMm: number;
  allocatedWidthMm: number;
  unallocatedWidthMm: number;
  placements: KitchenRunPlacement[];
  modules: FurnitureModule[];
  fronts: FrontSpec[];
  issues: KitchenRunComposeIssue[];
  ready: boolean;
}

const DEFAULT_STANDARD_WIDTHS = [300, 400, 450, 500, 600, 800, 900, 1000, 1200] as const;
const PREFERRED_WIDTH: Partial<Record<KitchenLibraryModuleId, number>> = {
  'base.storage': 600, 'base.drawers': 600, 'base.sink': 600, 'base.oven_hob': 600, 'base.dishwasher': 600, 'base.open': 600,
  'wall.storage': 600, 'wall.hood': 600, 'wall.open': 600,
  'tall.pantry': 600, 'tall.oven': 600, 'tall.fridge': 600, 'tall.open': 600,
  'technical.base': 100, 'technical.wall': 100, 'technical.tall': 100,
};

function technicalId(type: KitchenModuleType): KitchenLibraryModuleId {
  return type === 'base' ? 'technical.base' : type === 'wall' ? 'technical.wall' : 'technical.tall';
}

function defaultFillId(type: KitchenModuleType): KitchenLibraryModuleId {
  return type === 'base' ? 'base.storage' : type === 'wall' ? 'wall.storage' : 'tall.pantry';
}

function exact(widthMm: number) {
  return { mode: 'fixed' as const, value: { value: mm(widthMm), state: 'confirmed' as const } };
}

function makeModule(runId: string, serial: number, id: KitchenLibraryModuleId, widthMm: number, name?: string): FurnitureModule {
  const d = KITCHEN_MODULE_LIBRARY[id];
  return {
    id: `${runId}:module:${String(serial).padStart(3,'0')}`,
    libraryModuleId: id,
    kind: d.moduleKind,
    ...(name ? { name } : { name: d.label }),
    width: exact(widthMm),
    contents: [],
    kitchen: { type: d.type, function: d.function, ...d.defaults },
    tags: ['kitchen-run-composer', ...d.tags],
  };
}

function makeFront(runId: string, module: FurnitureModule, serial: number): FrontSpec | null {
  const fn = module.kitchen?.function;
  if (fn === 'open' || module.libraryModuleId?.startsWith('technical.')) return null;
  if (fn === 'dishwasher') return {
    id:`${runId}:front:${String(serial).padStart(3,'0')}`, moduleIds:[module.id], kind:'fixed_panel', count:1, split:'none', opening:'not_applicable', note:'Composer appliance front / reservation',
  };
  if (fn === 'drawers') return {
    id:`${runId}:front:${String(serial).padStart(3,'0')}`, moduleIds:[module.id], kind:'drawer_front', count:3, split:'horizontal', opening:'not_applicable', note:'Composer default; adjust drawer stack before release',
  };
  return {
    id:`${runId}:front:${String(serial).padStart(3,'0')}`, moduleIds:[module.id], kind:'hinged', count:1, split:'none', opening:'left', note:'Composer default; confirm hinge side before production',
  };
}

function chooseRequirementWidth(req: KitchenRunRequirement, standards: number[]): number {
  if (req.widthMm != null) return req.widthMm;
  const preferred = PREFERRED_WIDTH[req.libraryModuleId] ?? 600;
  const min = req.minWidthMm ?? 0;
  const max = req.maxWidthMm ?? Number.POSITIVE_INFINITY;
  const candidates = standards.filter(w => w >= min && w <= max);
  if (!candidates.length) return Math.max(min, Math.min(max, preferred));
  return candidates.slice().sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred) || b-a)[0]!;
}

/**
 * Exact integer dynamic-programming fill. It maximises cabinet-covered width, then prefers fewer modules.
 * The remaining millimetres intentionally become a technical filler instead of silently stretching a carcass.
 */
function bestStandardFill(target: number, standards: number[], minimum: number): number[] {
  const allowed=[...new Set(standards.filter(w=>Number.isFinite(w)&&w>=minimum).map(w=>Math.round(w)))].sort((a,b)=>b-a);
  if (target <= 0 || !allowed.length) return [];
  const dp: Array<number[] | null> = Array(target+1).fill(null);
  dp[0]=[];
  for(let sum=1;sum<=target;sum++){
    let best:number[]|null=null;
    for(const w of allowed){
      if(w>sum || !dp[sum-w]) continue;
      const candidate=[...dp[sum-w]!,w];
      if(!best || candidate.length<best.length) best=candidate;
    }
    dp[sum]=best;
  }
  for(let sum=target;sum>=0;sum--) if(dp[sum]) return dp[sum]!;
  return [];
}

export function composeKitchenRun(input: KitchenRunComposerInput): KitchenRunComposeResult {
  const issues: KitchenRunComposeIssue[]=[];
  const requested=Math.round(input.widthMm);
  if(!Number.isFinite(requested) || requested<=0){
    issues.push({code:'RUN_WIDTH_INVALID',severity:'blocking',message:'Kitchen run width must be a positive finite millimetre value.'});
    return {runId:input.runId,requestedWidthMm:requested,allocatedWidthMm:0,unallocatedWidthMm:requested,placements:[],modules:[],fronts:[],issues,ready:false};
  }
  const type=input.type ?? 'base';
  const standards=(input.standardWidthsMm ?? [...DEFAULT_STANDARD_WIDTHS]).map(Math.round).filter(x=>x>0);
  const left=Math.max(0,Math.round(input.leftFillerMm ?? 0));
  const right=Math.max(0,Math.round(input.rightFillerMm ?? 0));
  const minimum=Math.max(1,Math.round(input.minimumFillModuleMm ?? 300));
  const required: Array<{id:KitchenLibraryModuleId;width:number;name?:string}>=[];
  for(const req of input.requirements ?? []){
    const d=KITCHEN_MODULE_LIBRARY[req.libraryModuleId];
    if(d.type!==type){
      issues.push({code:'MODULE_TYPE_MISMATCH',severity:'blocking',message:`${req.libraryModuleId} is a ${d.type} module and cannot be placed in a ${type} run.`});
      continue;
    }
    const count=Math.max(1,Math.round(req.count ?? 1));
    for(let i=0;i<count;i++) required.push({id:req.libraryModuleId,width:chooseRequirementWidth(req,standards),...(req.name?{name:req.name}:{})});
  }
  const fixedTotal=left+right+required.reduce((s,x)=>s+x.width,0);
  if(fixedTotal>requested){
    issues.push({code:'RUN_REQUIREMENTS_OVERFLOW',severity:'blocking',message:`Required kitchen modules and fillers need ${fixedTotal} mm but the run is only ${requested} mm.`});
  }
  let remaining=Math.max(0,requested-fixedTotal);
  const autoWidths=input.fillRemainingWithCabinets===false?[]:bestStandardFill(remaining,standards,minimum);
  const autoTotal=autoWidths.reduce((s,w)=>s+w,0);
  remaining-=autoTotal;
  if(remaining>0 && remaining<minimum && autoTotal===0 && input.fillRemainingWithCabinets!==false){
    issues.push({code:'FILL_WIDTH_BELOW_MINIMUM',severity:'warning',message:`Remaining ${remaining} mm is below the automatic cabinet minimum ${minimum} mm and will be a technical filler.`});
  }
  const specs: Array<{id:KitchenLibraryModuleId;width:number;source:KitchenRunPlacement['source'];name?:string}>=[];
  if(left>0) specs.push({id:technicalId(type),width:left,source:'technical_fill',name:'Left site-fit filler'});
  specs.push(...required.map(x=>({...x,source:'required' as const})));
  const fillId=input.fillModuleId ?? defaultFillId(type);
  if(KITCHEN_MODULE_LIBRARY[fillId].type!==type){
    issues.push({code:'MODULE_TYPE_MISMATCH',severity:'blocking',message:`Fill module ${fillId} cannot be used in a ${type} run.`});
  } else {
    specs.push(...autoWidths.map(width=>({id:fillId,width,source:'auto_fill' as const})));
  }
  if(remaining>0) specs.push({id:technicalId(type),width:remaining,source:'technical_fill',name:'Run remainder / site-fit filler'});
  if(right>0) specs.push({id:technicalId(type),width:right,source:'technical_fill',name:'Right site-fit filler'});

  let x=0; let serial=1;
  const placements:KitchenRunPlacement[]=[];
  for(const spec of specs){
    const module=makeModule(input.runId,serial,spec.id,spec.width,spec.name);
    placements.push({index:serial-1,module,xMm:x,widthMm:spec.width,source:spec.source});
    x+=spec.width; serial++;
  }
  const modules=placements.map(p=>p.module);
  const fronts=modules.map((m,i)=>makeFront(input.runId,m,i+1)).filter((x):x is FrontSpec=>x!==null);
  const allocated=x;
  const unallocated=requested-allocated;
  return {runId:input.runId,requestedWidthMm:requested,allocatedWidthMm:allocated,unallocatedWidthMm:unallocated,placements,modules,fronts,issues,ready:!issues.some(i=>i.severity==='blocking') && unallocated===0};
}

/** Replace only the run geometry/modules/fronts of an existing furniture item, preserving materials and construction. */
export function applyKitchenRunComposition(furniture: FurnitureItem, composition: KitchenRunComposeResult): FurnitureItem {
  return {
    ...structuredClone(furniture),
    dimensions:{...structuredClone(furniture.dimensions),width:{value:mm(composition.requestedWidthMm),state:'confirmed'}},
    modules:structuredClone(composition.modules),
    fronts:structuredClone(composition.fronts),
    tags:[...new Set([...(furniture.tags??[]),'kitchen-run-composer'])],
  };
}
