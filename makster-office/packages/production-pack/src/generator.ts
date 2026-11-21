import { createHash, randomUUID } from 'node:crypto';
import type { EngineeringCompileResult, MachiningOperation, PanelPart } from '../../engineering-engine/src/types.js';
import { buildProjectLifecycleReleaseGate } from '../../engineering-engine/src/lifecycle-release-gate.js';
import type { MaterialSelection, ProjectModelV1 } from '../../project-model/src/types.js';
import { PRODUCTION_PACK_VERSION, type BuiltProductionPack, type OutsourcePreset, type ProductionPackBlocker, type ProductionPackBuildInput, type ProductionPackFileInfo, type ProductionService } from './types.js';

function sha256(text: string): string { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function mm10(value: number): number { return Number((value / 10).toFixed(1)); }
function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function csv(rows: unknown[][]): string { return rows.map(row => row.map(csvCell).join(',')).join('\n') + '\n'; }
function esc(value: unknown): string { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }


function installationDecisionsCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['decision_id','kind','status','title','detail','approved_by','approved_at','source_revision','furniture_id','module_id']];
  for(const d of project.installationDecisions??[]) rows.push([
    d.id,d.kind,d.status,d.title,d.detail,d.approvedBy,d.approvedAt,d.sourceRevision,d.targetFurnitureId??'',d.targetModuleId??''
  ]);
  return csv(rows);
}

function siteInstallationChecklist(project:ProjectModelV1):string {
  const tasks=(project.installationDecisions??[]).filter(d=>d.kind==='site_task'&&d.status!=='cancelled');
  const lines=[
    'MAKSTER SITE INSTALLATION CHECKLIST',
    `Project: ${project.title}`,
    `Revision: ${project.revision}`,
    '',
    ...tasks.flatMap((d,i)=>[
      `${i+1}. [${d.status==='completed'?'X':' '}] ${d.title}`,
      `   ${d.detail}`,
      `   Decision: ${d.id}`,
      `   Approved by: ${d.approvedBy} @ ${d.approvedAt}`,
      ...(d.completedAt?[`   Completed: ${d.completedAt}`]:[]),
      ''
    ])
  ];
  if(!tasks.length)lines.push('No approved site tasks for this revision.');
  return lines.join('\n')+'\n';
}


function siteIssuesCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['issue_id','status','severity','title','detail','reported_by','reported_at','source_revision','furniture_id','module_id']];
  for(const i of project.installationSiteIssues??[]) rows.push([
    i.id,i.status,i.severity,i.title,i.detail,i.reportedBy,i.reportedAt,i.sourceRevision,i.targetFurnitureId??'',i.targetModuleId??''
  ]);
  return csv(rows);
}
function installerExecutionJson(project:ProjectModelV1):string {
  return JSON.stringify({
    version:'2.9.1',projectId:project.projectId,revision:project.revision,title:project.title,
    siteTasks:(project.installationDecisions??[]).filter(d=>d.kind==='site_task'&&d.status!=='cancelled'),
    siteIssues:(project.installationSiteIssues??[]).filter(i=>i.status!=='cancelled')
  },null,2)+'\n';
}

function siteChangeRequestsCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','status','title','reason','requested_by','requested_at','reviewed_by','reviewed_at','furniture_id','x_mm','y_mm','z_mm','source_revision','applied_revision']];
  for(const c of project.installationChangeRequests??[])rows.push([c.id,c.status,c.title,c.reason,c.requestedBy,c.requestedAt,c.reviewedBy??'',c.reviewedAt??'',c.targetFurnitureId??'',c.proposedPositionMm?.x??'',c.proposedPositionMm?.y??'',c.proposedPositionMm?.z??'',c.sourceRevision,c.appliedRevision??'']);
  return csv(rows);
}
function asBuiltCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','title','detail','recorded_by','recorded_at','source_revision','furniture_id']];
  for(const a of project.asBuiltRecords??[])rows.push([a.id,a.title,a.detail,a.recordedBy,a.recordedAt,a.sourceRevision,a.targetFurnitureId??'']);
  return csv(rows);
}

function punchListCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','status','severity','title','detail','created_by','created_at','closed_by','closed_at','source_revision','furniture_id']];
  for(const p of project.installationPunchItems??[])rows.push([p.id,p.status,p.severity,p.title,p.detail,p.createdBy,p.createdAt,p.closedBy??'',p.closedAt??'',p.sourceRevision,p.targetFurnitureId??'']);
  return csv(rows);
}
function handoverTxt(project:ProjectModelV1):string {
  const h=project.installationHandover;
  if(!h)return 'Installation handover not signed for this revision.\n';
  return [
    'MAKSTER INSTALLATION HANDOVER',
    `Project: ${project.title}`,
    `Revision: ${project.revision}`,
    `Signed by: ${h.signedBy}`,
    `Client: ${h.clientName??'—'}`,
    `Installer: ${h.installerName??'—'}`,
    `Signed at: ${h.signedAt}`,
    `Source revision: ${h.sourceRevision}`,
    `Notes: ${h.notes??'—'}`,
    ''
  ].join('\n');
}

function jobControlJson(project:ProjectModelV1):string {
  const j=project.jobControl;
  return JSON.stringify({
    version:'3.0.0',
    projectId:project.projectId,
    revision:project.revision,
    title:project.title,
    client:j?.client??{},
    stage:j?.stage??'lead',
    money:j?.money??{currency:project.currency},
    targetDeliveryAt:j?.targetDeliveryAt??null,
    targetInstallationAt:j?.targetInstallationAt??null,
    milestones:j?.milestones??[],
    updatedAt:j?.updatedAt??null
  },null,2)+'\n';
}

function purchasingJson(project:ProjectModelV1):string {
  return JSON.stringify({
    version:'3.1.0',projectId:project.projectId,revision:project.revision,
    purchaseOrders:project.purchaseOrders??[],
    committedPurchaseMinor:project.jobControl?.money?.committedPurchaseMinor??0,
    currency:project.jobControl?.money?.currency??project.currency
  },null,2)+'\n';
}
function supplierOrdersCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['order_id','supplier','status','currency','line_id','kind','description','qty','unit','unit_price_minor','received_qty','supplier_reference','expected_at']];
  for(const o of project.purchaseOrders??[])for(const l of o.lines)rows.push([o.id,o.supplierName,o.status,o.currency,l.id,l.kind,l.description,l.quantity,l.unit,l.unitPriceMinor??'',l.receivedQuantity??0,o.supplierReference??'',o.expectedAt??'']);
  return csv(rows);
}

function costingJson(project:ProjectModelV1):string {
  const active=(project.purchaseOrders??[]).filter(o=>!['draft','cancelled'].includes(o.status));
  const purchasingCommittedMinor=active.reduce((sum,o)=>sum+o.lines.reduce((s,l)=>s+(l.unitPriceMinor??0)*l.quantity,0),0);
  const purchasingActualMinor=active.reduce((sum,o)=>sum+o.lines.reduce((s,l)=>s+(l.unitPriceMinor??0)*Math.min(l.quantity,l.receivedQuantity??0),0),0);
  const manualEstimateMinor=(project.costEntries??[]).filter(x=>x.basis==='estimate').reduce((s,x)=>s+x.amountMinor,0);
  const manualActualMinor=(project.costEntries??[]).filter(x=>x.basis==='actual').reduce((s,x)=>s+x.amountMinor,0);
  const contractValueMinor=project.jobControl?.money.contractValueMinor??0;
  return JSON.stringify({
    version:'3.2.0',projectId:project.projectId,revision:project.revision,
    currency:project.jobControl?.money.currency??project.currency,
    contractValueMinor,purchasingCommittedMinor,purchasingActualMinor,
    manualEstimateMinor,manualActualMinor,
    totalEstimateMinor:purchasingCommittedMinor+manualEstimateMinor,
    totalActualMinor:purchasingActualMinor+manualActualMinor,
    forecastMarginMinor:contractValueMinor-(purchasingCommittedMinor+manualEstimateMinor),
    actualMarginMinor:contractValueMinor-(purchasingActualMinor+manualActualMinor)
  },null,2)+'\n';
}
function costEntriesCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','basis','category','description','amount_minor','currency','source','source_id','created_by','created_at','note']];
  for(const x of project.costEntries??[])rows.push([x.id,x.basis,x.category,x.description,x.amountMinor,x.currency,x.source,x.sourceId??'',x.createdBy,x.createdAt,x.note??'']);
  return csv(rows);
}

function clientApprovalsCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','kind','status','title','description','requested_by','requested_at','source_revision','content_fingerprint','approved_revision','responded_by','responded_at','response_comment','client_amount_minor']];
  for(const a of project.clientApprovals??[])rows.push([
    a.id,a.kind,a.status,a.title,a.description,a.requestedBy,a.requestedAt,a.sourceRevision,a.contentFingerprint??'',a.approvedRevision??'',
    a.respondedBy??'',a.respondedAt??'',a.responseComment??'',a.clientAmountMinor??''
  ]);
  return csv(rows);
}
function clientPortalSnapshotJson(project:ProjectModelV1):string {
  const p=project.clientPortal;
  const j=project.jobControl;
  const contract=j?.money.contractValueMinor??0,received=j?.money.receivedMinor??0;
  return JSON.stringify({
    version:'3.4.0',projectId:project.projectId,revision:project.revision,
    enabled:p?.enabled??false,title:p?.publicTitle??project.title,welcomeText:p?.welcomeText??null,
    stage:j?.stage??'lead',
    client:{name:j?.client.name??null,company:j?.client.company??null,objectAddress:j?.client.objectAddress??null},
    commercial:{
      currency:j?.money.currency??project.currency,
      ...(p?.showContractValue!==false?{contractValueMinor:contract}:{}),
      ...(p?.showPayments!==false?{receivedMinor:received,outstandingMinor:Math.max(0,contract-received)}:{})
    },
    approvals:(project.clientApprovals??[]).filter(a=>a.status!=='cancelled').map(a=>({
      id:a.id,kind:a.kind,status:a.status,title:a.title,description:a.description,sourceRevision:a.sourceRevision,
      approvedRevision:a.approvedRevision??null,clientAmountMinor:a.clientAmountMinor??null,responseComment:a.responseComment??null
    }))
  },null,2)+'\n';
}

function clientShareLinksCsv(project:ProjectModelV1):string {
  const rows:unknown[][]=[['id','status','label','created_by','created_at','expires_at','one_time','used_at','approval_responses','approval_scope_count','source_revision']];
  const now=Date.now();
  for(const l of project.clientShareLinks??[]){
    const status=l.status==='active'&&((l.oneTime&&l.usedAt)||(l.expiresAt&&Date.parse(l.expiresAt)<=now))?'expired':l.status;
    rows.push([l.id,status,l.label??'',l.createdBy,l.createdAt,l.expiresAt??'',Boolean(l.oneTime),l.usedAt??'',l.allowApprovalResponses,l.approvalIds?.length??0,l.sourceRevision]);
  }
  return csv(rows);
}

function lifecycleReleaseGateJson(project:ProjectModelV1,engineering:EngineeringCompileResult):string {
  return JSON.stringify(buildProjectLifecycleReleaseGate(project,engineering),null,2)+'\n';
}
function servicesForPreset(preset: OutsourcePreset | undefined): ProductionService[] {
  if (preset === 'cutting_only') return ['cutting'];
  if (preset === 'cutting_edging') return ['cutting', 'edging'];
  return ['cutting', 'edging', 'drilling'];
}

function materialMap(project: ProjectModelV1): Map<string, MaterialSelection> {
  return new Map(project.selections.materials.map(m => [m.id, m]));
}

function materialLabel(material: MaterialSelection | undefined): string {
  if (!material) return 'UNRESOLVED';
  return [material.manufacturer, material.code, material.name].filter(Boolean).join(' · ') || material.id;
}

function partStatus(part: PanelPart): string { return part.estimated ? 'CHECK' : 'EXACT'; }

function edgeLengthMm(part: PanelPart): number {
  let one = 0;
  for (const edge of part.edges) one += edge.side === 'top' || edge.side === 'bottom' ? mm10(Number(part.width)) : mm10(Number(part.length));
  return one * part.quantity;
}

function fileInfo(name: string, content: string, purpose: string, mediaType = 'text/plain; charset=utf-8'): ProductionPackFileInfo {
  return { name, mediaType, purpose, sha256: sha256(content), byteLength: Buffer.byteLength(content, 'utf8') };
}

function cutlist(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const materials = materialMap(project);
  return csv([
    ['part_id','name','kind','qty','length_mm','width_mm','thickness_mm','material','material_selection_id','grain','status'],
    ...engineering.parts.map(part => [part.id,part.name,part.kind,part.quantity,mm10(Number(part.length)),mm10(Number(part.width)),mm10(Number(part.thickness)),materialLabel(part.materialSelectionId ? materials.get(part.materialSelectionId) : undefined),part.materialSelectionId ?? '',part.grainDirection,partStatus(part)]),
  ]);
}

function edging(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const materials = materialMap(project);
  const rows: unknown[][] = [['part_id','part_name','qty','edge_side','part_length_mm','part_width_mm','edge_length_each_mm','edge_length_total_mm','edge_thickness_mm','edge_material','edge_material_selection_id','note']];
  for (const part of engineering.parts) for (const edge of part.edges) {
    const each = edge.side === 'top' || edge.side === 'bottom' ? mm10(Number(part.width)) : mm10(Number(part.length));
    rows.push([part.id,part.name,part.quantity,edge.side,mm10(Number(part.length)),mm10(Number(part.width)),each,Number((each*part.quantity).toFixed(1)),edge.thickness ? mm10(Number(edge.thickness)) : '',materialLabel(edge.materialSelectionId ? materials.get(edge.materialSelectionId) : undefined),edge.materialSelectionId ?? '',edge.note ?? '']);
  }
  return csv(rows);
}

function drilling(engineering: EngineeringCompileResult): string {
  return csv([
    ['operation_id','part_id','kind','face','x_mm','y_mm','diameter_mm','depth_mm','length_mm','tool_width_mm','status','verification_source','reference','note'],
    ...engineering.machining.map(op => [op.id,op.targetPartId,op.kind,op.face,mm10(Number(op.x)),mm10(Number(op.y)),op.diameter ? mm10(Number(op.diameter)) : '',op.depth ? mm10(Number(op.depth)) : '',op.length ? mm10(Number(op.length)) : '',op.toolWidth ? mm10(Number(op.toolWidth)) : '',op.estimated || op.kind === 'reference_line' ? 'CHECK/REFERENCE' : 'EXACT',op.verificationSource ?? '',op.reference ?? '',op.note ?? '']),
  ]);
}

function hardware(engineering: EngineeringCompileResult): string {
  return csv([
    ['requirement_id','name','role','qty','unit','length_mm','hardware_selection_id','status','note'],
    ...engineering.hardware.map(item => [item.id,item.name,item.role,item.quantity,item.unit,item.length ? mm10(Number(item.length)) : '',item.hardwareSelectionId ?? '',item.estimated ? 'CHECK' : 'EXACT',item.note ?? '']),
  ]);
}

function labels(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const materials = materialMap(project);
  return csv([
    ['label_no','project','revision','part_id','part_name','kind','qty','size_mm','material','edges','grain'],
    ...engineering.parts.map((part,index) => [index+1,project.title,project.revision,part.id,part.name,part.kind,part.quantity,`${mm10(Number(part.length))} x ${mm10(Number(part.width))} x ${mm10(Number(part.thickness))}`,materialLabel(part.materialSelectionId ? materials.get(part.materialSelectionId) : undefined),part.edges.map(e=>`${e.side}:${e.thickness ? mm10(Number(e.thickness))+'mm' : ''}`).join('|'),part.grainDirection]),
  ]);
}

function materialSummary(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const materials = materialMap(project);
  const groups = new Map<string,{qty:number,area:number,parts:number}>();
  for (const part of engineering.parts) {
    const key = part.materialSelectionId ?? 'UNRESOLVED';
    const g = groups.get(key) ?? {qty:0,area:0,parts:0};
    g.qty += part.quantity;
    g.parts += 1;
    g.area += mm10(Number(part.length))*mm10(Number(part.width))*part.quantity/1_000_000;
    groups.set(key,g);
  }
  return csv([
    ['material_selection_id','material','physical_parts','unique_rows','area_m2'],
    ...[...groups.entries()].map(([id,g])=>[id,materialLabel(materials.get(id)),g.qty,g.parts,g.area.toFixed(3)]),
  ]);
}

function assemblySequence(engineering: EngineeringCompileResult): string {
  const rows: unknown[][] = [['step','scope','action','related_parts']];
  let step = 1;
  for (const furniture of engineering.furniture) {
    const modules = [...new Set(furniture.parts.map(p=>p.moduleId).filter(Boolean))];
    for (const moduleId of modules) {
      const moduleParts = furniture.parts.filter(p=>p.moduleId===moduleId);
      const carcass = moduleParts.filter(p=>['side','top','bottom','back','plinth'].includes(p.kind));
      const interior = moduleParts.filter(p=>['shelf','drawer_side','drawer_back','drawer_bottom','drawer_front'].includes(p.kind));
      rows.push([step++,String(moduleId),'Собрать корпус и проверить диагонали',carcass.map(p=>p.id).join('|')]);
      if (interior.length) rows.push([step++,String(moduleId),'Установить внутреннее наполнение / ящики после проверки присадки',interior.map(p=>p.id).join('|')]);
    }
    const fronts = furniture.parts.filter(p=>p.kind==='front');
    if (fronts.length) rows.push([step++,furniture.name,'Навесить/установить фасады и отрегулировать зазоры',fronts.map(p=>p.id).join('|')]);
  }
  rows.push([step++,'project','Финальная проверка: размеры, кромка, фурнитура, комплектность, маркировка','']);
  return csv(rows);
}

function workshopChecklist(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const unresolved = engineering.machining.filter(op=>op.estimated || op.kind==='reference_line');
  const operationalCodes = new Set([
    'KITCHEN_CUTOUT_ON_SITE',
    'KITCHEN_APPLIANCE_SITE_FIT',
    'HINGE_MANUAL_TEMPLATE',
    'GTV_RUNNER_MANUAL_TEMPLATE',
    'KITCHEN_WALL_HANGER_MANUAL_TEMPLATE',
  ]);
  const operational = engineering.issues.filter(issue=>operationalCodes.has(issue.code));
  return [
    `MAKSTER MANUAL WORKSHOP PACK`,
    `Project: ${project.title}`,
    `Revision: ${project.revision}`,
    `Engineering: ${engineering.engineVersion} / ${engineering.ruleSetId}`,
    ``,
    `PRE-CUT CHECK`,
    `[ ] Сверить материал, толщину и направление текстуры`,
    `[ ] Сверить количество деталей: ${engineering.stats.panelPartCount}`,
    `[ ] Проверить детали со статусом CHECK`,
    ``,
    `EDGE CHECK`,
    `[ ] Кромка нанесена только на стороны из edging.csv`,
    `[ ] Проверить направление детали до кромления`,
    ``,
    `DRILLING / MACHINING`,
    `[ ] Перед сверлением проверить локальную систему координат детали`,
    `[ ] Операции CHECK/REFERENCE не переносить механически без проверки`,
    `[ ] Неопределённых/референсных операций: ${unresolved.length}`,
    ``,
    `MANUAL / ON-SITE OPERATIONS`,
    ...(operational.length ? operational.map(issue=>`[ ] ${issue.code}: ${issue.message}`) : ['[ ] Нет специальных ручных/объектовых операций']),
    ``,
    `ASSEMBLY`,
    `[ ] Собирать по assembly-sequence.csv`,
    `[ ] Проверять диагонали каждого корпуса до установки задней стенки`,
    `[ ] Регулировку фасадов делать после выставления корпусов`,
    ``,
    `FINAL`,
    `[ ] Все детали промаркированы`,
    `[ ] Фурнитура комплектна`,
    `[ ] Замечания Engineering просмотрены`,
  ].join('\n') + '\n';
}

function printableHtml(project: ProjectModelV1, engineering: EngineeringCompileResult): string {
  const materials = materialMap(project);
  const rows = engineering.parts.map(part=>`<tr><td>${esc(part.id)}</td><td>${esc(part.name)}</td><td>${part.quantity}</td><td>${mm10(Number(part.length))} × ${mm10(Number(part.width))} × ${mm10(Number(part.thickness))}</td><td>${esc(materialLabel(part.materialSelectionId ? materials.get(part.materialSelectionId) : undefined))}</td><td>${esc(part.edges.map(e=>e.side).join(', '))}</td></tr>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(project.title)} · Production Pack</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{margin-bottom:4px}.meta{color:#555;margin-bottom:20px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}.warn{padding:10px;border:1px solid #999;margin:14px 0}</style></head><body><h1>${esc(project.title)}</h1><div class="meta">Revision ${project.revision} · Makster Production Pack 1.0</div><div class="warn">Перед производством сверяйте строки CHECK/REFERENCE и актуальную revision.</div><table><thead><tr><th>ID</th><th>Деталь</th><th>Кол.</th><th>Размер, мм</th><th>Материал</th><th>Кромка</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function supplierOrderJson(input: ProductionPackBuildInput, services: ProductionService[], blockers: ProductionPackBlocker[]): string {
  return JSON.stringify({
    format: 'makster-supplier-order-v1',
    projectId: input.project.projectId,
    revision: input.project.revision,
    projectTitle: input.project.title,
    supplierName: input.supplierName ?? null,
    orderReference: input.orderReference ?? `${input.project.projectId}-R${input.project.revision}`,
    services,
    readyToSend: blockers.length===0,
    blockers,
    instructions: {
      cutting: services.includes('cutting') ? 'Cut to final dimensions from cutlist.csv; preserve grain orientation.' : null,
      edging: services.includes('edging') ? 'Apply edge only to sides listed in edging.csv.' : null,
      drilling: services.includes('drilling') ? 'Use only EXACT rows in drilling.csv. CHECK/REFERENCE rows make this order blocked.' : null,
      labeling: 'Return every part with Makster part_id / label number.',
    },
  }, null, 2) + '\n';
}

function buildBlockers(input: ProductionPackBuildInput, services: ProductionService[]): {blockers:ProductionPackBlocker[],warnings:string[]} {
  const blockers: ProductionPackBlocker[] = [];
  const warnings: string[] = [];
  const e = input.engineering;
  if (!e.readyForProduction) blockers.push({code:'ENGINEERING_NOT_PRODUCTION_READY',message:`Engineering has ${e.checks.blocking} blocking and ${e.checks.errors} error checks`});
  const estimatedParts = e.parts.filter(p=>p.estimated);
  if (estimatedParts.length) blockers.push({code:'ESTIMATED_PANEL_PARTS',message:`${estimatedParts.length} panel rows are estimated`,...(estimatedParts[0]?.id ? {targetId:estimatedParts[0].id} : {})});
  const unresolvedMaterial = e.parts.filter(p=>!p.materialSelectionId);
  if (unresolvedMaterial.length && input.route==='outsource') blockers.push({code:'OUTSOURCE_MATERIAL_UNRESOLVED',message:`${unresolvedMaterial.length} part rows have no material selection`,...(unresolvedMaterial[0]?.id ? {targetId:unresolvedMaterial[0].id} : {})});
  if (services.includes('edging')) {
    const unresolvedEdges = e.parts.flatMap(p=>p.edges.filter(edge=>!edge.materialSelectionId).map(()=>p.id));
    if (unresolvedEdges.length) warnings.push(`${unresolvedEdges.length} edge operations have no catalog edge material; supplier must confirm matching edge.`);
  }
  const unresolvedMachining = e.machining.filter(op=>op.estimated || op.kind==='reference_line');
  if (input.route==='outsource' && services.includes('drilling') && unresolvedMachining.length) blockers.push({code:'OUTSOURCE_DRILLING_NOT_EXACT',message:`${unresolvedMachining.length} machining operations are estimated/reference-only; outsource drilling is not safe yet`,...(unresolvedMachining[0]?.targetPartId ? {targetId:unresolvedMachining[0].targetPartId} : {})});
  if (input.route==='manual_workshop' && unresolvedMachining.length) warnings.push(`${unresolvedMachining.length} machining operations are CHECK/REFERENCE. Use manufacturer jig/manual verification before mechanical drilling.`);
  for (const issue of e.issues.filter(i=>i.severity==='warning')) warnings.push(`${issue.code}: ${issue.message}`);
  return {blockers,warnings:[...new Set(warnings)]};
}

export function buildProductionPack(input: ProductionPackBuildInput): BuiltProductionPack {
  const services = input.route==='manual_workshop' ? ['cutting','edging','drilling'] as ProductionService[] : servicesForPreset(input.outsourcePreset);
  const {blockers,warnings}=buildBlockers(input,services);
  const files: Record<string,string> = {};
  files['cutlist.csv']=cutlist(input.project,input.engineering);
  files['materials.csv']=materialSummary(input.project,input.engineering);
  files['hardware.csv']=hardware(input.engineering);
  files['part-labels.csv']=labels(input.project,input.engineering);
  files['printable-parts.html']=printableHtml(input.project,input.engineering);
  if((input.project.installationDecisions??[]).length){
    files['installation-decisions.csv']=installationDecisionsCsv(input.project);
    files['site-installation-checklist.txt']=siteInstallationChecklist(input.project);
  }
  if((input.project.installationSiteIssues??[]).length){
    files['site-issues.csv']=siteIssuesCsv(input.project);
  }
  if((input.project.installationDecisions??[]).length||(input.project.installationSiteIssues??[]).length){
    files['installer-execution.json']=installerExecutionJson(input.project);
  }
  if((input.project.installationChangeRequests??[]).length)files['site-change-requests.csv']=siteChangeRequestsCsv(input.project);
  if((input.project.asBuiltRecords??[]).length)files['as-built.csv']=asBuiltCsv(input.project);
  if((input.project.installationPunchItems??[]).length)files['punch-list.csv']=punchListCsv(input.project);
  if(input.project.installationHandover)files['installation-handover.txt']=handoverTxt(input.project);
  if(input.project.jobControl)files['job-control.json']=jobControlJson(input.project);
  if((input.project.purchaseOrders??[]).length){
    files['purchasing.json']=purchasingJson(input.project);
    files['supplier-orders.csv']=supplierOrdersCsv(input.project);
  }
  if(input.project.jobControl||(input.project.costEntries??[]).length){
    files['costing.json']=costingJson(input.project);
  }
  if((input.project.costEntries??[]).length)files['cost-entries.csv']=costEntriesCsv(input.project);
  if((input.project.clientApprovals??[]).length)files['client-approvals.csv']=clientApprovalsCsv(input.project);
  if(input.project.clientPortal?.enabled)files['client-portal-snapshot.json']=clientPortalSnapshotJson(input.project);
  if((input.project.clientShareLinks??[]).length)files['client-share-links.csv']=clientShareLinksCsv(input.project);
  files['lifecycle-release-gate.json']=lifecycleReleaseGateJson(input.project,input.engineering);
  if (services.includes('edging')) files['edging.csv']=edging(input.project,input.engineering);
  if (services.includes('drilling')) files['drilling.csv']=drilling(input.engineering);
  if (input.route==='manual_workshop') {
    files['assembly-sequence.csv']=assemblySequence(input.engineering);
    files['workshop-checklist.txt']=workshopChecklist(input.project,input.engineering);
  } else {
    files['supplier-order.json']=supplierOrderJson(input,services,blockers);
    files['supplier-readme.txt']=[
      'MAKSTER OUTSOURCE PRODUCTION PACK',
      `Project: ${input.project.title}`,
      `Revision: ${input.project.revision}`,
      `Services: ${services.join(', ')}`,
      '',
      'IMPORTANT:',
      '- Manufacture only this revision.',
      '- Preserve part_id labels on returned parts.',
      '- Follow grain direction from cutlist.csv.',
      '- Edge only listed sides.',
      '- If drilling.csv exists, process only when supplier-order.json readyToSend=true.',
      '- Any ambiguity requires clarification before production.',
    ].join('\n')+'\n';
  }

  const edgeOps=input.engineering.parts.reduce((s,p)=>s+p.edges.length*p.quantity,0);
  const exactMachining=input.engineering.machining.filter(op=>!op.estimated && op.kind!=='reference_line').length;
  const filePurpose: Record<string,string>={
    'cutlist.csv':'Panel cutting list','materials.csv':'Material requirement summary','hardware.csv':'Hardware requirement list','part-labels.csv':'Part identification labels','printable-parts.html':'Printable workshop/supplier part schedule','edging.csv':'Edge banding by part side','drilling.csv':'Drilling and machining coordinate map','assembly-sequence.csv':'Recommended manual assembly order','workshop-checklist.txt':'Manual workshop quality checklist','supplier-order.json':'Machine-readable outsource order contract','supplier-readme.txt':'Supplier production instructions','installation-decisions.csv':'Approved installation/design decisions for this revision','site-installation-checklist.txt':'Approved site work checklist','site-issues.csv':'Installation issues reported from site','installer-execution.json':'Machine-readable installer execution state','site-change-requests.csv':'Site-originated controlled change requests','as-built.csv':'Applied site changes / as-built record','punch-list.csv':'Installation punch list','installation-handover.txt':'Signed installation handover summary','job-control.json':'Business lifecycle snapshot for this exact project revision','purchasing.json':'Purchasing/order state for this exact revision','supplier-orders.csv':'Supplier order lines and receipt state','costing.json':'Estimate/actual cost and margin snapshot','cost-entries.csv':'Manual project cost entries','client-approvals.csv':'Client approval audit trail','client-portal-snapshot.json':'Public-safe client portal snapshot','client-share-links.csv':'Share-link audit metadata without token hashes','lifecycle-release-gate.json':'Cross-system lifecycle release gate for this exact revision'
  };
  const infos=Object.entries(files).sort(([a],[b])=>a.localeCompare(b)).map(([name,content])=>fileInfo(name,content,filePurpose[name] ?? name,name.endsWith('.json')?'application/json; charset=utf-8':name.endsWith('.csv')?'text/csv; charset=utf-8':name.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8'));
  const manifest={
    packVersion:PRODUCTION_PACK_VERSION,
    packId:input.packId ?? randomUUID(),
    route:input.route,
    ...(input.route==='outsource'?{outsourcePreset:input.outsourcePreset ?? 'cutting_edging_drilling'}:{}),
    services,
    projectId:input.project.projectId,
    revision:input.project.revision,
    projectTitle:input.project.title,
    generatedAt:input.generatedAt ?? new Date().toISOString(),
    engineeringEngineVersion:input.engineering.engineVersion,
    engineeringRulesetId:input.engineering.ruleSetId,
    engineeringInputChecksum:input.engineering.inputChecksum,
    ready:blockers.length===0,
    blockers,warnings,
    summary:{
      physicalPanelParts:input.engineering.stats.panelPartCount,
      uniquePanelRows:input.engineering.parts.length,
      edgeOperations:edgeOps,
      edgeLengthMm:Number(input.engineering.parts.reduce((s,p)=>s+edgeLengthMm(p),0).toFixed(1)),
      machiningOperations:input.engineering.machining.length,
      exactMachiningOperations:exactMachining,
      unresolvedMachiningOperations:input.engineering.machining.length-exactMachining,
      hardwareRequirementRows:input.engineering.hardware.length,
      installationDecisionRows:(input.project.installationDecisions??[]).filter(d=>d.status!=='cancelled').length,
      openSiteTaskRows:(input.project.installationDecisions??[]).filter(d=>d.kind==='site_task'&&d.status==='approved').length,
      openSiteIssueRows:(input.project.installationSiteIssues??[]).filter(i=>i.status==='open').length,
    },
    files:infos,
  } as const;
  files['production-pack-manifest.json']=JSON.stringify(manifest,null,2)+'\n';
  return {manifest,files};
}
