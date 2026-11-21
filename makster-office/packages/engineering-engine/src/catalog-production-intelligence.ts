
import { toMm, type ProjectModelV1, type KitchenApplianceSpec } from '../../project-model/src/types.js';
import {
  getHardwareCatalogRecord,
  getApplianceCatalogRecord,
  hardwareMayAuthorizeDrilling,
} from './master-catalog.js';
import { evaluateApplianceCompatibility } from './catalog-compatibility.js';
import type { EngineeringIssue, CncReleaseBlocker, ProductionIntelligenceAction } from './types.js';

export interface ProductionIntelligenceResult {
  issues: EngineeringIssue[];
  cncBlockers: CncReleaseBlocker[];
  actions: ProductionIntelligenceAction[];
}

function issueId(code:string,target:string){return `catalog-production:${code}:${target}`;}
function measured(v:any):number|undefined{return v?.value==null?undefined:toMm(v.value);}

function applianceList(module:any):KitchenApplianceSpec[]{
  return module.kitchen?.appliances?.length ? module.kitchen.appliances : module.kitchen?.appliance ? [module.kitchen.appliance] : [];
}

export function evaluateCatalogProductionIntelligence(project:ProjectModelV1):ProductionIntelligenceResult {
  const issues:EngineeringIssue[]=[];
  const cncBlockers:CncReleaseBlocker[]=[];
  const actions:ProductionIntelligenceAction[]=[];

  for(const h of project.selections.hardware){
    if(!h.catalogRecordId)continue;
    const record=getHardwareCatalogRecord(h.catalogRecordId);
    if(!record){
      issues.push({
        id:issueId('CATALOG_HARDWARE_RECORD_MISSING',h.id),code:'CATALOG_HARDWARE_RECORD_MISSING',
        severity:'blocking',category:'hardware',
        message:`Assigned hardware ${h.catalogRecordId} is no longer present in the trusted master catalog.`,
        targetId:h.id,metadata:{catalogRecordId:h.catalogRecordId}
      });
      cncBlockers.push({code:'CATALOG_HARDWARE_RECORD_MISSING',message:`Missing catalog record ${h.catalogRecordId}`,hardwareSelectionId:h.id});
      actions.push({id:`action:${h.id}`,targetType:'hardware',hardwareSelectionId:h.id,catalogRecordId:h.catalogRecordId,status:'blocked',action:'Restore/replace the missing trusted catalog record before production.'});
      continue;
    }
    const drill=hardwareMayAuthorizeDrilling(record);
    if(drill){
      actions.push({
        id:`action:${h.id}`,targetType:'hardware',hardwareSelectionId:h.id,catalogRecordId:record.id,status:'ready',
        action:`Use trusted drilling profile ${record.drillingProfile?.profileId}.`,source:record.source
      });
    } else if(h.machiningMethod==='manual_template'||h.machiningMethod==='manual_measure'){
      actions.push({
        id:`action:${h.id}`,targetType:'hardware',hardwareSelectionId:h.id,catalogRecordId:record.id,status:'manual_required',
        action:`Automatic CNC drilling is not authorized. Execute ${h.machiningMethod.replace('_',' ')} and retain the workshop check.`,source:record.source
      });
      cncBlockers.push({code:'CATALOG_DRILLING_MANUAL_ONLY',message:`${record.manufacturer} ${record.family} is manual-only for drilling.`,hardwareSelectionId:h.id});
    } else {
      issues.push({
        id:issueId('CATALOG_DRILLING_PROFILE_REQUIRED',h.id),code:'CATALOG_DRILLING_PROFILE_REQUIRED',
        severity:'blocking',category:'hardware',
        message:`${record.manufacturer} ${record.family}${record.code?` ${record.code}`:''} is assigned, but no trusted drilling profile or explicit manual machining method is approved.`,
        targetId:h.id,metadata:{catalogRecordId:record.id,trust:record.trust,source:record.source}
      });
      cncBlockers.push({code:'CATALOG_DRILLING_PROFILE_REQUIRED',message:`Trusted drilling/manual method required for ${record.id}.`,hardwareSelectionId:h.id});
      actions.push({
        id:`action:${h.id}`,targetType:'hardware',hardwareSelectionId:h.id,catalogRecordId:record.id,status:'verification_required',
        action:'Import manufacturer drilling data or approve manual_template/manual_measure before release.',source:record.source
      });
    }
  }

  for(const furniture of project.furniture){
    for(const module of furniture.modules){
      for(const [index,a] of applianceList(module).entries()){
        if(!a.catalogRecordId)continue;
        const record=getApplianceCatalogRecord(a.catalogRecordId);
        const target=`${module.id}:${index}`;
        if(!record){
          issues.push({
            id:issueId('CATALOG_APPLIANCE_RECORD_MISSING',target),code:'CATALOG_APPLIANCE_RECORD_MISSING',
            severity:'blocking',category:'hardware',message:`Assigned appliance ${a.catalogRecordId} is missing from master catalog.`,
            furnitureId:furniture.id,moduleId:module.id,targetId:module.id,metadata:{catalogRecordId:a.catalogRecordId}
          });
          actions.push({id:`action:${target}`,targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,catalogRecordId:a.catalogRecordId,status:'blocked',action:'Restore/replace appliance catalog record before production.'});
          continue;
        }

        const w=measured(a.requiredSpace?.width),h=measured(a.requiredSpace?.height),d=measured(a.requiredSpace?.depth);
        if(a.fitMode!=='site_fit'&&(w==null||h==null||d==null)){
          issues.push({
            id:issueId('CATALOG_APPLIANCE_ENVELOPE_REQUIRED',target),code:'CATALOG_APPLIANCE_ENVELOPE_REQUIRED',
            severity:'blocking',category:'construction',
            message:`${record.manufacturer} ${record.model} requires confirmed project installation envelope W×H×D before production.`,
            furnitureId:furniture.id,moduleId:module.id,targetId:module.id,
            metadata:{catalogRecordId:record.id,source:record.source}
          });
          actions.push({id:`action:${target}`,targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,catalogRecordId:record.id,status:'verification_required',action:'Confirm installation envelope from the manufacturer installation drawing.',source:record.source});
          continue;
        }

        if(w!=null||h!=null||d!=null){
          const comp=evaluateApplianceCompatibility(record,{
            kind:record.kind,
            ...(w==null?{}:{nicheWidthMm:w}),
            ...(h==null?{}:{nicheHeightMm:h}),
            ...(d==null?{}:{nicheDepthMm:d}),
            ...(a.verifiedVentilationAreaCm2==null?{}:{ventilationAreaCm2:a.verifiedVentilationAreaCm2})
          });
          if(comp.status==='incompatible'){
            issues.push({
              id:issueId('CATALOG_APPLIANCE_INSTALLATION_CONFLICT',target),code:'CATALOG_APPLIANCE_INSTALLATION_CONFLICT',
              severity:'blocking',category:'geometry',
              message:`${record.manufacturer} ${record.model} conflicts with confirmed installation constraints: ${comp.issues.map(x=>x.message).join(' ')}`,
              furnitureId:furniture.id,moduleId:module.id,targetId:module.id,metadata:{catalogRecordId:record.id,source:record.source}
            });
            actions.push({id:`action:${target}`,targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,catalogRecordId:record.id,status:'blocked',action:'Change appliance or cabinet/niche geometry.',source:record.source});
            continue;
          }
        }

        const minVent=record.compatibility?.minVentilationAreaCm2;
        if(minVent!=null && a.verifiedVentilationAreaCm2==null){
          issues.push({
            id:issueId('CATALOG_APPLIANCE_VENTILATION_REQUIRED',target),code:'CATALOG_APPLIANCE_VENTILATION_REQUIRED',
            severity:'blocking',category:'construction',
            message:`${record.manufacturer} ${record.model} requires at least ${minVent} cm² ventilation; project ventilation is not yet confirmed.`,
            furnitureId:furniture.id,moduleId:module.id,targetId:module.id,metadata:{catalogRecordId:record.id,minVentilationAreaCm2:minVent,source:record.source}
          });
          actions.push({id:`action:${target}`,targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,catalogRecordId:record.id,status:'verification_required',action:`Confirm at least ${minVent} cm² ventilation in the furniture design.`,source:record.source});
          continue;
        }

        actions.push({
          id:`action:${target}`,targetType:'appliance',furnitureId:furniture.id,moduleId:module.id,catalogRecordId:record.id,
          status:a.fitMode==='site_fit'?'manual_required':'ready',
          action:a.fitMode==='site_fit'?'Verify final appliance fit on site before installation.':'Use confirmed manufacturer installation envelope and retain source with production pack.',
          source:record.source
        });
      }
    }
  }

  return {issues,cncBlockers,actions};
}
