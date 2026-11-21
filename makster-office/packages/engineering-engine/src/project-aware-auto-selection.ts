
import { toMm, type ProjectModelV1, type FurnitureItem, type FurnitureModule, type FrontSpec } from '../../project-model/src/types.js';
import { autoSelectHardware, autoSelectAppliances, type AutoSelectionResult } from './catalog-auto-selection.js';
import type { HardwareCatalogRecord, ApplianceCatalogRecord } from './master-catalog.js';

export interface ProjectAwareRecommendation {
  furnitureId: string;
  moduleId: string;
  moduleLibraryId?: string;
  target: 'hinge' | 'runner' | 'appliance';
  targetRefId?: string;
  applianceIndex?: number;
  context: Record<string, unknown>;
  result: AutoSelectionResult<HardwareCatalogRecord | ApplianceCatalogRecord>;
  note: string;
}

export interface ProjectAwareSelectionReport {
  version: '2.7.5';
  projectId: string;
  revision: number;
  recommendations: ProjectAwareRecommendation[];
  readyCount: number;
  reviewCount: number;
  issues: string[];
}

function measured(v:any):number|undefined {
  return v?.value == null ? undefined : toMm(v.value);
}

function frontThickness(project:ProjectModelV1, front:FrontSpec|undefined):number|undefined {
  if(!front?.materialSelectionId)return;
  const mat=project.selections.materials.find(m=>m.id===front.materialSelectionId);
  return measured(mat?.thickness);
}

function frontsForModule(item:FurnitureItem,module:FurnitureModule):FrontSpec[] {
  return item.fronts.filter(f=>f.moduleIds.includes(module.id));
}

function assignedRunnerContext(project:ProjectModelV1,module:FurnitureModule){
  const drawers=module.contents.filter((x:any)=>x.kind==='drawer_stack') as any[];
  for(const d of drawers){
    if(!d.runnerHardwareSelectionId)continue;
    const sel=project.selections.hardware.find(h=>h.id===d.runnerHardwareSelectionId);
    const tech:any=sel?.technical;
    if(tech?.kind==='blum_runner'||tech?.kind==='gtv_modern_slide'){
      const nominalLengthMm=measured(tech.nominalLength);
      return nominalLengthMm==null?{}:{desiredNominalLengthMm:nominalLengthMm};
    }
  }
  return {};
}

function applianceContext(module:FurnitureModule){
  const specs=[...(module.kitchen?.appliances??[]),...(module.kitchen?.appliance?[module.kitchen.appliance]:[])];
  return specs.map(a=>{
    const s:any=a.requiredSpace;
    const width=measured(s?.width),height=measured(s?.height),depth=measured(s?.depth);
    const kind=a.kind==='fridge'?'fridge':a.kind==='dishwasher'?'dishwasher':a.kind==='oven'?'oven':a.kind==='hob'?'hob':a.kind==='hood'?'hood':a.kind==='microwave'?'microwave':a.kind==='sink'?'sink':'other';
    return {a,kind,width,height,depth};
  });
}

export function analyzeProjectCatalogSelections(project:ProjectModelV1):ProjectAwareSelectionReport {
  const recommendations:ProjectAwareRecommendation[]=[];
  const issues:string[]=[];

  for(const item of project.furniture){
    for(const module of item.modules){
      const fronts=frontsForModule(item,module);
      const hinged=fronts.find(f=>f.kind==='hinged');
      if(hinged){
        const thickness=frontThickness(project,hinged);
        const context:any={role:'hinge',maxResults:3,requireProductionDrilling:false};
        if(thickness!=null)context.frontThicknessMm=thickness;
        const result=autoSelectHardware(context);
        recommendations.push({
          furnitureId:item.id,moduleId:module.id,...(module.libraryModuleId?{moduleLibraryId:module.libraryModuleId}:{}),
          target:'hinge',targetRefId:hinged.id,context,result,
          note:thickness==null?'Front thickness is not confirmed; hinge fit remains partially UNKNOWN.':`Front thickness read from ProjectModel: ${thickness} mm.`,
        });
      }

      if(module.contents.some((x:any)=>x.kind==='drawer_stack')){
        const runnerCtx:any={role:'runner',maxResults:3,...assignedRunnerContext(project,module)};
        const result=autoSelectHardware(runnerCtx);
        const drawerTarget=module.contents.find((x:any)=>x.kind==='drawer_stack') as any;
        recommendations.push({
          furnitureId:item.id,moduleId:module.id,...(module.libraryModuleId?{moduleLibraryId:module.libraryModuleId}:{}),
          target:'runner',...(drawerTarget?.id?{targetRefId:drawerTarget.id}:{}),context:runnerCtx,result,
          note:runnerCtx.desiredNominalLengthMm==null
            ?'No confirmed runner nominal length exists in ProjectModel; Makster does not derive one from cabinet depth.'
            :`Runner nominal length read from assigned technical selection: ${runnerCtx.desiredNominalLengthMm} mm.`,
        });
      }

      for(const [applianceIndex,ap] of applianceContext(module).entries()){
        const context:any={kind:ap.kind,maxResults:3};
        if(ap.width!=null)context.nicheWidthMm=ap.width;
        if(ap.height!=null)context.nicheHeightMm=ap.height;
        if(ap.depth!=null)context.nicheDepthMm=ap.depth;
        const result=autoSelectAppliances(context);
        recommendations.push({
          furnitureId:item.id,moduleId:module.id,...(module.libraryModuleId?{moduleLibraryId:module.libraryModuleId}:{}),
          target:'appliance',applianceIndex,context,result,
          note:(ap.width==null&&ap.height==null&&ap.depth==null)
            ?`${ap.a.kind} has no confirmed requiredSpace; selection is advisory only.`
            :`${ap.a.kind} niche context read from requiredSpace in ProjectModel.`,
        });
      }
    }
  }

  if(!recommendations.length)issues.push('No hinge, drawer, or appliance targets were found in this project revision.');
  const readyCount=recommendations.filter(r=>r.result.ready).length;
  return {
    version:'2.7.5',
    projectId:project.projectId,
    revision:project.revision,
    recommendations,
    readyCount,
    reviewCount:recommendations.length-readyCount,
    issues,
  };
}
