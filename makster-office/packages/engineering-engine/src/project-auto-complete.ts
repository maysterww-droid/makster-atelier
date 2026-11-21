
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import { analyzeProjectCatalogSelections, type ProjectAwareRecommendation } from './project-aware-auto-selection.js';
import { evaluateCatalogProductionIntelligence } from './catalog-production-intelligence.js';

export type AutoCompleteStatus = 'complete' | 'safe_auto' | 'needs_approval' | 'needs_measurement' | 'blocking';
export type AutoCompleteArea = 'hardware' | 'appliance' | 'geometry' | 'production';

export interface ProjectAutoCompleteItem {
  id: string;
  area: AutoCompleteArea;
  status: AutoCompleteStatus;
  title: string;
  detail: string;
  furnitureId?: string;
  moduleId?: string;
  recommendationIndex?: number;
  candidateId?: string;
  target?: ProjectAwareRecommendation['target'];
  targetRefId?: string;
  applianceIndex?: number;
  action?: string;
}

export interface ProjectAutoCompleteReport {
  version: '2.8.3';
  projectId: string;
  revision: number;
  items: ProjectAutoCompleteItem[];
  summary: {
    complete: number;
    safeAuto: number;
    needsApproval: number;
    needsMeasurement: number;
    blocking: number;
    readinessPercent: number;
  };
}

function selectedHardwareExists(project:ProjectModelV1,r:ProjectAwareRecommendation):boolean{
  const furniture=project.furniture.find(f=>f.id===r.furnitureId);
  const module=furniture?.modules.find(m=>m.id===r.moduleId);
  if(!furniture||!module)return false;
  if(r.target==='hinge'){
    const front=furniture.fronts.find(f=>f.id===r.targetRefId);
    return Boolean(front?.hingeHardwareSelectionId);
  }
  if(r.target==='runner'){
    const drawer=module.contents.find((x:any)=>x.kind==='drawer_stack'&&(!r.targetRefId||x.id===r.targetRefId)) as any;
    return Boolean(drawer?.runnerHardwareSelectionId);
  }
  if(r.target==='appliance'){
    const apps=[...(module.kitchen?.appliances??[]),...(module.kitchen?.appliance?[module.kitchen.appliance]:[])];
    const a=apps[r.applianceIndex??0];
    return Boolean(a?.catalogRecordId);
  }
  return false;
}

export function analyzeProjectAutoComplete(project:ProjectModelV1):ProjectAutoCompleteReport{
  const items:ProjectAutoCompleteItem[]=[];
  const selection=analyzeProjectCatalogSelections(project);
  const prod=evaluateCatalogProductionIntelligence(project);

  selection.recommendations.forEach((r,index)=>{
    const assigned=selectedHardwareExists(project,r);
    if(assigned){
      items.push({
        id:`assigned:${r.target}:${r.moduleId}:${r.targetRefId??r.applianceIndex??0}`,
        area:r.target==='appliance'?'appliance':'hardware',status:'complete',
        title:`${r.target.toUpperCase()} assigned`,
        detail:'A catalog-backed selection is already assigned in the current Project Revision.',
        furnitureId:r.furnitureId,moduleId:r.moduleId
      });
      return;
    }

    const c=r.result.recommended;
    const missingContext =
      (r.target==='hinge' && r.context.frontThicknessMm==null)
      || (r.target==='runner' && r.context.desiredNominalLengthMm==null)
      || (r.target==='appliance' && r.context.nicheWidthMm==null && r.context.nicheHeightMm==null && r.context.nicheDepthMm==null);

    if(missingContext){
      items.push({
        id:`measurement:${r.target}:${r.moduleId}:${r.targetRefId??r.applianceIndex??0}`,
        area:r.target==='appliance'?'appliance':'hardware',status:'needs_measurement',
        title:r.target==='runner'?'Runner nominal length not confirmed':r.target==='hinge'?'Front thickness not confirmed':'Appliance installation envelope not confirmed',
        detail:r.note,
        furnitureId:r.furnitureId,moduleId:r.moduleId,target:r.target,
        ...(r.targetRefId?{targetRefId:r.targetRefId}:{}),
        ...(r.applianceIndex!=null?{applianceIndex:r.applianceIndex}:{}),
        action:'Confirm the missing project measurement/specification before automatic assignment.'
      });
      return;
    }

    if(c?.compatibilityStatus==='compatible'){
      items.push({
        id:`approval:${r.target}:${r.moduleId}:${r.targetRefId??r.applianceIndex??0}`,
        area:r.target==='appliance'?'appliance':'hardware',status:'needs_approval',
        title:`Compatible ${r.target} candidate available`,
        detail:`${c.record.manufacturer} ${'family' in c.record?c.record.family:c.record.model} · ${c.selectionScore}/100`,
        furnitureId:r.furnitureId,moduleId:r.moduleId,recommendationIndex:index,candidateId:c.record.id,target:r.target,
        ...(r.targetRefId?{targetRefId:r.targetRefId}:{}),
        ...(r.applianceIndex!=null?{applianceIndex:r.applianceIndex}:{}),
        action:'Apply through explicit approval; Makster will create a new Project Revision.'
      });
    }else{
      items.push({
        id:`blocking-selection:${r.target}:${r.moduleId}:${r.targetRefId??r.applianceIndex??0}`,
        area:r.target==='appliance'?'appliance':'hardware',status:'blocking',
        title:`No confirmed compatible ${r.target}`,
        detail:c?`Best candidate is ${c.compatibilityStatus}.`:'No candidate exists in the current trusted catalog.',
        furnitureId:r.furnitureId,moduleId:r.moduleId,
        action:'Add/verify catalog data or change project constraints.'
      });
    }
  });

  for(const a of prod.actions){
    if(a.status==='ready')continue;
    const status:AutoCompleteStatus =
      a.status==='manual_required'?'needs_approval':
      a.status==='verification_required'?'needs_measurement':'blocking';
    items.push({
      id:`production:${a.id}`,
      area:a.targetType==='appliance'?'appliance':'production',status,
      title:a.status==='manual_required'?'Manual production method required':a.status==='verification_required'?'Production verification required':'Production blocked',
      detail:a.action,
      ...(a.furnitureId?{furnitureId:a.furnitureId}:{}),
      ...(a.moduleId?{moduleId:a.moduleId}:{}),
      action:a.action
    });
  }

  const counts={
    complete:items.filter(x=>x.status==='complete').length,
    safeAuto:items.filter(x=>x.status==='safe_auto').length,
    needsApproval:items.filter(x=>x.status==='needs_approval').length,
    needsMeasurement:items.filter(x=>x.status==='needs_measurement').length,
    blocking:items.filter(x=>x.status==='blocking').length,
  };
  const denom=Math.max(1,items.length);
  const readinessPercent=Math.round(((counts.complete + counts.safeAuto*0.8 + counts.needsApproval*0.45) / denom)*100);
  return {version:'2.8.3',projectId:project.projectId,revision:project.revision,items,summary:{...counts,readinessPercent}};
}
