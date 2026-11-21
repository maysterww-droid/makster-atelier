import { createHash, randomUUID } from 'node:crypto';
import type { BomItem, HardwareBomItem, MaterialBomItem, PanelPart } from '../../engineering-engine/src/types.js';
import type { MaterialSelection, ProjectModelV1 } from '../../project-model/src/types.js';
import { bpsAmount, formatMoney, roundToIncrement, assertMinor } from './money.js';
import { COMMERCIAL_ENGINE_VERSION, type BuildClientQuoteInput, type BuildCommercialEstimateInput, type BuildCommercialPackageInput, type BuiltCommercialPackage, type ClientCommercialQuote, type CommercialCostLine, type CommercialEstimate, type CommercialPackageFileInfo, type CommercialPricingProfile, type EdgePriceRule, type HardwarePriceRule, type MaterialPriceRule } from './types.js';

function canonical(value:unknown):string {
  if(value===null||typeof value!=='object') return JSON.stringify(value);
  if(Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj=value as Record<string,unknown>;
  return `{${Object.keys(obj).sort().map(k=>`${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}
function sha256(value:string):string { return createHash('sha256').update(value,'utf8').digest('hex'); }
function fingerprint(value:unknown):string { return sha256(canonical(value)); }
function csvCell(v:unknown):string { const s=String(v??''); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
function csv(rows:unknown[][]):string { return rows.map(r=>r.map(csvCell).join(',')).join('\n')+'\n'; }
function esc(v:unknown):string { return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function sum(lines:CommercialCostLine[], category?:string):number { return lines.filter(l=>!category||l.category===category).reduce((a,b)=>a+b.totalCostMinor,0); }
function materialName(project:ProjectModelV1,id:string|undefined):string { const m=project.selections.materials.find(x=>x.id===id); return [m?.manufacturer,m?.code,m?.name].filter(Boolean).join(' · ') || id || 'Unresolved material'; }
function hardwareName(project:ProjectModelV1,id:string|undefined,fallback:string):string { const h=project.selections.hardware.find(x=>x.id===id); return [h?.manufacturer,h?.code,h?.name].filter(Boolean).join(' · ') || fallback; }
function materialRule(profile:CommercialPricingProfile,id:string|undefined,thicknessMm:number):MaterialPriceRule|undefined { if(!id) return undefined; return profile.materialPrices.find(r=>r.materialSelectionId===id&&r.thicknessMm===thicknessMm) ?? profile.materialPrices.find(r=>r.materialSelectionId===id&&r.thicknessMm==null); }
function hardwareRule(profile:CommercialPricingProfile,item:HardwareBomItem):HardwarePriceRule|undefined {
  return profile.hardwarePrices.find(r=>r.hardwareSelectionId&&r.hardwareSelectionId===item.hardwareSelectionId)
    ?? profile.hardwarePrices.find(r=>r.name&&r.name.toLowerCase()===item.name.toLowerCase())
    ?? profile.hardwarePrices.find(r=>r.role&&r.role===item.role);
}
function edgeRule(profile:CommercialPricingProfile,materialSelectionId:string|undefined):EdgePriceRule|undefined {
  return profile.edgePrices.find(r=>r.materialSelectionId===materialSelectionId) ?? profile.edgePrices.find(r=>!r.materialSelectionId);
}
function edgeLengthMm(part:PanelPart):number {
  let total=0;
  for(const edge of part.edges){ total+=(edge.side==='top'||edge.side==='bottom'?Number(part.width):Number(part.length))/10; }
  return total*part.quantity;
}
function priceMaterial(project:ProjectModelV1,item:MaterialBomItem,rule:MaterialPriceRule):CommercialCostLine {
  const areaM2=item.totalAreaMm2/1_000_000;
  let qty=areaM2; let unit='m²'; let cost=0; let note:string|undefined;
  if(rule.pricingMode==='per_m2') cost=Math.round(areaM2*rule.unitCostMinor);
  else {
    if(!rule.sheetLengthMm||!rule.sheetWidthMm) throw new Error(`sheet_dimensions_required:${rule.materialSelectionId}`);
    const sheetArea=rule.sheetLengthMm*rule.sheetWidthMm/1_000_000;
    const required=areaM2*(1+(rule.wasteBps??0)/10_000);
    qty=Math.ceil(required/sheetArea); unit='sheet'; cost=qty*rule.unitCostMinor;
    note=`Net area ${areaM2.toFixed(3)} m²; commercial waste ${(rule.wasteBps??0)/100}%; ${qty} sheet(s)`;
  }
  return {id:`material:${item.materialSelectionId}:${item.thickness}`,category:'material',label:rule.label??materialName(project,item.materialSelectionId),quantity:Number(qty.toFixed(3)),unit,unitCostMinor:rule.unitCostMinor,totalCostMinor:assertMinor(cost),source:rule.source??'price_catalog',...(item.materialSelectionId?{targetId:item.materialSelectionId}:{}),...(note?{note}:{})};
}
function priceHardware(project:ProjectModelV1,item:HardwareBomItem,rule:HardwarePriceRule):CommercialCostLine {
  const cost=Math.round(item.quantity*rule.unitCostMinor);
  return {id:`hardware:${item.hardwareSelectionId??item.role}:${item.name}`,category:'hardware',label:hardwareName(project,item.hardwareSelectionId,item.name),quantity:item.quantity,unit:item.unit,unitCostMinor:rule.unitCostMinor,totalCostMinor:assertMinor(cost),source:rule.source??'price_catalog',...(item.hardwareSelectionId?{targetId:item.hardwareSelectionId}:{})};
}
function pricingFingerprint(profile:CommercialPricingProfile):string { return fingerprint(profile); }
function packManifestFingerprint(pack:BuildCommercialEstimateInput['productionPack']):string|undefined {
  return pack ? fingerprint(pack.manifest) : undefined;
}

export function buildCommercialEstimate(input:BuildCommercialEstimateInput):CommercialEstimate {
  const {project,engineering,pricing}=input;
  if(pricing.currency!==project.currency) throw new Error(`pricing_currency_mismatch:${pricing.currency}:${project.currency}`);
  const blockers:CommercialEstimate['blockers']=[]; const warnings:CommercialEstimate['warnings']=[]; const lines:CommercialCostLine[]=[];
  if(!engineering.readyForProduction) blockers.push({code:'ENGINEERING_NOT_PRODUCTION_READY',message:'Engineering must be Production READY before a commercial estimate can be finalized.'});
  const materialGroups=new Map<string,MaterialBomItem>();
  const hardwareItems:HardwareBomItem[]=[];
  for(const bom of engineering.bom as BomItem[]){
    if(bom.kind==='panel_material'){
      if(!bom.materialSelectionId){ blockers.push({code:'MATERIAL_SELECTION_UNRESOLVED',message:'Engineering BOM contains a panel material without materialSelectionId.',...(bom.partIds[0]?{targetId:bom.partIds[0]}:{})}); continue; }
      const key=`${bom.materialSelectionId}:${bom.thickness}`; const existing=materialGroups.get(key);
      if(existing){ existing.quantity+=bom.quantity; existing.totalAreaMm2+=bom.totalAreaMm2; existing.partIds.push(...bom.partIds); }
      else materialGroups.set(key,structuredClone(bom));
    } else hardwareItems.push(bom);
  }
  for(const bom of materialGroups.values()){
    const thicknessMm=Number(bom.thickness)/10; const rule=materialRule(pricing,bom.materialSelectionId,thicknessMm);
    if(!rule){ blockers.push({code:'MATERIAL_PRICE_MISSING',message:`No price rule for ${materialName(project,bom.materialSelectionId)} ${thicknessMm} mm.`,targetId:bom.materialSelectionId!}); continue; }
    lines.push(priceMaterial(project,bom,rule));
  }
  for(const bom of hardwareItems){
    const rule=hardwareRule(pricing,bom);
    if(!rule){ blockers.push({code:'HARDWARE_PRICE_MISSING',message:`No hardware price rule for ${bom.name}.`,...(bom.hardwareSelectionId?{targetId:bom.hardwareSelectionId}:{})}); continue; }
    lines.push(priceHardware(project,bom,rule));
  }
  const edgeGroups=new Map<string,{lengthMm:number;materialSelectionId?:string}>();
  for(const part of engineering.parts){
    for(const edge of part.edges){
      const key=edge.materialSelectionId??'__default__'; const g=edgeGroups.get(key)??{lengthMm:0,...(edge.materialSelectionId?{materialSelectionId:edge.materialSelectionId}:{})};
      g.lengthMm+=(edge.side==='top'||edge.side==='bottom'?Number(part.width):Number(part.length))/10*part.quantity; edgeGroups.set(key,g);
    }
  }
  for(const [key,g] of edgeGroups){
    const rule=edgeRule(pricing,g.materialSelectionId);
    if(!rule){ blockers.push({code:'EDGE_PRICE_MISSING',message:`No edge price rule for ${key}.`,...(g.materialSelectionId?{targetId:g.materialSelectionId}:{})}); continue; }
    const meters=g.lengthMm/1000; lines.push({id:`edge:${key}`,category:'edge',label:g.materialSelectionId?materialName(project,g.materialSelectionId):'Edge band',quantity:Number(meters.toFixed(3)),unit:'m',unitCostMinor:rule.unitCostPerMeterMinor,totalCostMinor:Math.round(meters*rule.unitCostPerMeterMinor),source:rule.source??'price_catalog',...(g.materialSelectionId?{targetId:g.materialSelectionId}:{})});
  }
  for(const labor of pricing.labor){
    if(labor.minutes<0||labor.hourlyCostMinor<0) throw new Error(`invalid_labor:${labor.id}`);
    const cost=Math.round(labor.minutes*labor.hourlyCostMinor/60);
    lines.push({id:`labor:${labor.id}`,category:labor.category??'labor',label:labor.label,quantity:Number((labor.minutes/60).toFixed(2)),unit:'h',unitCostMinor:labor.hourlyCostMinor,totalCostMinor:cost,source:labor.source??'manual'});
  }
  for(const fixed of pricing.fixedCosts){
    lines.push({id:`fixed:${fixed.id}`,category:fixed.category,label:fixed.label,quantity:1,unit:'fixed',unitCostMinor:assertMinor(fixed.costMinor),totalCostMinor:fixed.costMinor,source:fixed.source??'manual',...(fixed.sourceReference?{sourceReference:fixed.sourceReference}:{})});
  }
  if(pricing.supplierQuote){
    lines.push({id:`supplier:${pricing.supplierQuote.quoteId}`,category:'external_service',label:`${pricing.supplierQuote.supplierName}: ${pricing.supplierQuote.services.join(' + ')}`,quantity:1,unit:'quote',unitCostMinor:pricing.supplierQuote.totalPriceMinor,totalCostMinor:pricing.supplierQuote.totalPriceMinor,source:'supplier_quote',sourceReference:pricing.supplierQuote.quoteId,targetId:pricing.supplierQuote.supplierId});
  }
  const direct=sum(lines);
  const overhead=bpsAmount(direct,pricing.overheadBps);
  if(overhead) lines.push({id:'overhead',category:'overhead',label:`Overhead (${(pricing.overheadBps/100).toFixed(2)}%)`,quantity:1,unit:'fixed',unitCostMinor:overhead,totalCostMinor:overhead,source:'derived'});
  const totalCost=direct+overhead;
  const beforeDiscount=roundToIncrement(totalCost+bpsAmount(totalCost,pricing.markupBps),pricing.commercialRoundingMinor);
  const discount=bpsAmount(beforeDiscount,pricing.discountBps);
  const net=beforeDiscount-discount;
  const tax=bpsAmount(net,pricing.taxBps);
  const gross=net+tax;
  const profit=net-totalCost;
  const marginBps=net>0?Math.round(profit/net*10_000):0;
  if(profit<0) warnings.push({code:'NEGATIVE_PROFIT',message:'The current commercial price is below full calculated cost.'});
  if(pricing.discountBps>0) warnings.push({code:'DISCOUNT_APPLIED',message:`Discount ${(pricing.discountBps/100).toFixed(2)}% reduces commercial margin.`});
  const generatedAt=input.generatedAt??new Date().toISOString();
  const base={commercialVersion:COMMERCIAL_ENGINE_VERSION,estimateId:input.estimateId??randomUUID(),estimateVersion:input.estimateVersion??1,projectId:project.projectId,revision:project.revision,projectTitle:project.title,currency:project.currency,generatedAt,engineeringInputChecksum:engineering.inputChecksum,...(input.productionPack?{productionPackId:input.productionPack.manifest.packId,productionPackManifestSha256:fingerprint(input.productionPack.manifest)}:{}),pricingProfileId:pricing.profileId,pricingProfileFingerprint:pricingFingerprint(pricing),ready:blockers.length===0,blockers,warnings,lines,totals:{directCostMinor:direct,overheadMinor:overhead,totalCostMinor:totalCost,sellBeforeDiscountMinor:beforeDiscount,discountMinor:discount,netSalesMinor:net,taxMinor:tax,grossSalesMinor:gross,profitMinor:profit,marginBps,markupBps:pricing.markupBps,discountBps:pricing.discountBps,taxBps:pricing.taxBps}};
  return {...base,estimateFingerprint:fingerprint(base)};
}

function addDays(iso:string,days:number):string { const d=new Date(iso); d.setUTCDate(d.getUTCDate()+days); return d.toISOString(); }
export function buildClientQuote(input:BuildClientQuoteInput):ClientCommercialQuote {
  if(!input.estimate.ready) throw new Error('commercial_estimate_not_ready');
  const issuedAt=input.issuedAt??new Date().toISOString(); const validUntil=addDays(issuedAt,input.terms.validityDays??14);
  const terms=input.terms.paymentTerms?.length?input.terms.paymentTerms:[{label:'Deposit',bps:5000},{label:'Balance',bps:5000}];
  const bpsTotal=terms.reduce((a,b)=>a+b.bps,0); if(bpsTotal!==10_000) throw new Error(`payment_terms_bps_must_equal_10000:${bpsTotal}`);
  let allocated=0; const schedule=terms.map((t,i)=>{const amount=i===terms.length-1?input.estimate.totals.grossSalesMinor-allocated:bpsAmount(input.estimate.totals.grossSalesMinor,t.bps); allocated+=amount; return {label:t.label,bps:t.bps,amountMinor:amount};});
  const base={commercialVersion:COMMERCIAL_ENGINE_VERSION,quoteId:input.quoteId??randomUUID(),quoteVersion:input.quoteVersion??1,estimateId:input.estimate.estimateId,estimateFingerprint:input.estimate.estimateFingerprint,projectId:input.estimate.projectId,revision:input.estimate.revision,projectTitle:input.estimate.projectTitle,clientName:input.terms.clientName,...(input.terms.clientCompany?{clientCompany:input.terms.clientCompany}:{}),currency:input.estimate.currency,status:'draft' as const,issuedAt,validUntil,...(input.terms.leadTimeText?{leadTimeText:input.terms.leadTimeText}:{}),netAmountMinor:input.estimate.totals.netSalesMinor,taxBps:input.estimate.totals.taxBps,taxAmountMinor:input.estimate.totals.taxMinor,totalAmountMinor:input.estimate.totals.grossSalesMinor,paymentSchedule:schedule,inclusions:input.terms.inclusions??[],exclusions:input.terms.exclusions??[],notes:input.terms.notes??[],seller:{name:input.terms.sellerName??'Makster Atelier',...(input.terms.sellerEmail?{email:input.terms.sellerEmail}:{}),...(input.terms.sellerPhone?{phone:input.terms.sellerPhone}:{})}};
  return {...base,quoteFingerprint:fingerprint(base)};
}

function internalBreakdownCsv(estimate:CommercialEstimate):string { return csv([['category','label','quantity','unit','unit_cost_minor','total_cost_minor','source','source_reference','target_id','note'],...estimate.lines.map(l=>[l.category,l.label,l.quantity,l.unit,l.unitCostMinor,l.totalCostMinor,l.source,l.sourceReference??'',l.targetId??'',l.note??'']),[],['TOTAL COST','','','','',estimate.totals.totalCostMinor],['NET SALES','','','','',estimate.totals.netSalesMinor],['PROFIT','','','','',estimate.totals.profitMinor],['MARGIN BPS','','','','',estimate.totals.marginBps]]); }
function clientHtml(quote:ClientCommercialQuote):string {
  const pay=quote.paymentSchedule.map(p=>`<tr><td>${esc(p.label)}</td><td>${(p.bps/100).toFixed(0)}%</td><td>${esc(formatMoney(p.amountMinor,quote.currency))}</td></tr>`).join('');
  const list=(values:string[])=>values.length?`<ul>${values.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:'<p>—</p>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(quote.projectTitle)} — Commercial Offer</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#1c2924;line-height:1.45}h1{font-size:30px;margin-bottom:6px}h2{margin-top:30px;border-bottom:1px solid #d9e5df;padding-bottom:7px}.meta{color:#64756d}.price{font-size:34px;font-weight:700;margin:24px 0}.box{background:#f4faf7;border:1px solid #d8ebe2;border-radius:14px;padding:20px;margin:20px 0}table{border-collapse:collapse;width:100%}td,th{padding:9px;border-bottom:1px solid #e8eeeb;text-align:left}.small{font-size:12px;color:#6b756f}</style></head><body><div class="meta">MAKSTER · Commercial Offer · Revision ${quote.revision}</div><h1>${esc(quote.projectTitle)}</h1><p>Prepared for <strong>${esc(quote.clientName)}</strong>${quote.clientCompany?` · ${esc(quote.clientCompany)}`:''}</p><div class="box"><div>Price including configured tax</div><div class="price">${esc(formatMoney(quote.totalAmountMinor,quote.currency))}</div><div>Net: ${esc(formatMoney(quote.netAmountMinor,quote.currency))} · Tax: ${esc(formatMoney(quote.taxAmountMinor,quote.currency))}</div></div>${quote.leadTimeText?`<p><strong>Lead time:</strong> ${esc(quote.leadTimeText)}</p>`:''}<p><strong>Valid until:</strong> ${esc(quote.validUntil.slice(0,10))}</p><h2>Included</h2>${list(quote.inclusions)}<h2>Not included</h2>${list(quote.exclusions)}<h2>Payment schedule</h2><table><tr><th>Stage</th><th>Share</th><th>Amount</th></tr>${pay}</table><h2>Notes</h2>${list(quote.notes)}<p class="small">Quote ID ${esc(quote.quoteId)} · Fingerprint ${esc(quote.quoteFingerprint)} · Project revision ${quote.revision}</p><p><strong>${esc(quote.seller.name)}</strong>${quote.seller.email?` · ${esc(quote.seller.email)}`:''}${quote.seller.phone?` · ${esc(quote.seller.phone)}`:''}</p></body></html>`;
}
function info(name:string,content:string,purpose:string,mediaType:string):CommercialPackageFileInfo { return {name,purpose,mediaType,sha256:sha256(content),byteLength:Buffer.byteLength(content,'utf8')}; }
export function buildCommercialPackage(input:BuildCommercialPackageInput):BuiltCommercialPackage {
  const estimate=buildCommercialEstimate(input); const quote=buildClientQuote({estimate,terms:input.quoteTerms,...(input.quoteId?{quoteId:input.quoteId}:{}),...(input.quoteVersion?{quoteVersion:input.quoteVersion}:{}),...(input.generatedAt?{issuedAt:input.generatedAt}:{})});
  const files:Record<string,string>={
    'cost-estimate.json':JSON.stringify(estimate,null,2)+'\n',
    'cost-breakdown.csv':internalBreakdownCsv(estimate),
    'client-quote.json':JSON.stringify(quote,null,2)+'\n',
    'client-offer.html':clientHtml(quote),
  };
  const fileInfos=[info('cost-estimate.json',files['cost-estimate.json']!,'Internal deterministic commercial estimate','application/json'),info('cost-breakdown.csv',files['cost-breakdown.csv']!,'Internal cost and margin breakdown','text/csv; charset=utf-8'),info('client-quote.json',files['client-quote.json']!,'Client-facing quote contract without internal costs','application/json'),info('client-offer.html',files['client-offer.html']!,'Printable client commercial offer','text/html; charset=utf-8')];
  const manifest={commercialVersion:COMMERCIAL_ENGINE_VERSION,packageId:input.packageId??randomUUID(),estimateId:estimate.estimateId,estimateFingerprint:estimate.estimateFingerprint,quoteId:quote.quoteId,quoteFingerprint:quote.quoteFingerprint,projectId:estimate.projectId,revision:estimate.revision,generatedAt:input.generatedAt??new Date().toISOString(),files:fileInfos};
  files['commercial-package-manifest.json']=JSON.stringify(manifest,null,2)+'\n';
  return {estimate,quote,manifest,files};
}
