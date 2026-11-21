
import {
  HARDWARE_MASTER_CATALOG,
  allHardwareCatalogRecords,
  allApplianceCatalogRecords,
  APPLIANCE_MASTER_CATALOG,
  hardwareMayAuthorizeDrilling,
  type HardwareCatalogRecord,
  type ApplianceCatalogRecord,
} from './master-catalog.js';

export type CompatibilitySeverity = 'info' | 'warning' | 'blocking';
export type CompatibilityStatus = 'compatible' | 'conditional' | 'incompatible' | 'unknown';

export interface CompatibilityIssue {
  code:
    | 'ROLE_MISMATCH'
    | 'FRONT_TOO_THICK'
    | 'RUNNER_LENGTH_MISMATCH'
    | 'LOAD_EXCEEDS_RATING'
    | 'NICHE_WIDTH_MISMATCH'
    | 'NICHE_HEIGHT_MISMATCH'
    | 'NICHE_TOO_SHALLOW'
    | 'VENTILATION_TOO_SMALL'
    | 'DRILLING_NOT_AUTHORIZED'
    | 'INSUFFICIENT_VERIFIED_DATA';
  severity: CompatibilitySeverity;
  message: string;
}

export interface HardwareCompatibilityContext {
  role: HardwareCatalogRecord['role'];
  frontThicknessMm?: number;
  desiredNominalLengthMm?: number;
  expectedDynamicLoadKg?: number;
  requireProductionDrilling?: boolean;
}

export interface ApplianceCompatibilityContext {
  kind: ApplianceCatalogRecord['kind'];
  nicheWidthMm?: number;
  nicheHeightMm?: number;
  nicheDepthMm?: number;
  ventilationAreaCm2?: number;
}

export interface CatalogCompatibilityResult<T> {
  record: T;
  status: CompatibilityStatus;
  issues: CompatibilityIssue[];
  score: number;
  alternatives: Array<{ id: string; manufacturer: string; label: string; score: number }>;
}

function statusFrom(issues: CompatibilityIssue[]): CompatibilityStatus {
  if (issues.some(i => i.severity === 'blocking')) return 'incompatible';
  if (issues.some(i => i.severity === 'warning')) return 'conditional';
  if (issues.some(i => i.code === 'INSUFFICIENT_VERIFIED_DATA')) return 'unknown';
  return 'compatible';
}

function scoreFrom(issues: CompatibilityIssue[]): number {
  return Math.max(0, Math.round(
    100
    - issues.filter(i => i.severity === 'blocking').length * 45
    - issues.filter(i => i.severity === 'warning').length * 15
    - issues.filter(i => i.severity === 'info').length * 3,
  ));
}

function inRange(v: number, range: [number, number]): boolean {
  return v >= range[0] && v <= range[1];
}

function hardwareIssues(record: HardwareCatalogRecord, ctx: HardwareCompatibilityContext): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  if (record.role !== ctx.role) {
    issues.push({ code:'ROLE_MISMATCH', severity:'blocking', message:`${record.family} is ${record.role}, requested role is ${ctx.role}.` });
    return issues;
  }
  const c = record.compatibility;
  let requestedChecks = 0;
  let verifiedChecks = 0;

  if (ctx.frontThicknessMm != null) {
    requestedChecks++;
    if (c?.maxFrontThicknessMm != null) {
      verifiedChecks++;
      if (ctx.frontThicknessMm > c.maxFrontThicknessMm) {
        issues.push({ code:'FRONT_TOO_THICK', severity:'blocking', message:`Front ${ctx.frontThicknessMm} mm exceeds verified maximum ${c.maxFrontThicknessMm} mm for this profile.` });
      }
    }
  }
  if (ctx.desiredNominalLengthMm != null) {
    requestedChecks++;
    if (c?.nominalLengthMm != null) {
      verifiedChecks++;
      if (ctx.desiredNominalLengthMm !== c.nominalLengthMm) {
        issues.push({ code:'RUNNER_LENGTH_MISMATCH', severity:'blocking', message:`Requested runner ${ctx.desiredNominalLengthMm} mm does not match catalog record ${c.nominalLengthMm} mm.` });
      }
    }
  }
  if (ctx.expectedDynamicLoadKg != null) {
    requestedChecks++;
    if (c?.maxDynamicLoadKg != null) {
      verifiedChecks++;
      if (ctx.expectedDynamicLoadKg > c.maxDynamicLoadKg) {
        issues.push({ code:'LOAD_EXCEEDS_RATING', severity:'blocking', message:`Expected load ${ctx.expectedDynamicLoadKg} kg exceeds verified rating ${c.maxDynamicLoadKg} kg.` });
      }
    }
  }
  if (ctx.requireProductionDrilling && !hardwareMayAuthorizeDrilling(record)) {
    issues.push({ code:'DRILLING_NOT_AUTHORIZED', severity:'blocking', message:`${record.manufacturer} ${record.family} has no trusted drilling profile authorized for production.` });
  }
  if ((requestedChecks > verifiedChecks) || (requestedChecks === 0 && !ctx.requireProductionDrilling)) {
    issues.push({ code:'INSUFFICIENT_VERIFIED_DATA', severity:'info', message:'One or more requested compatibility facts are not normalized as verified data for this record.' });
  }
  return issues;
}
function applianceIssues(record: ApplianceCatalogRecord, ctx: ApplianceCompatibilityContext): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];
  if (record.kind !== ctx.kind) {
    issues.push({ code:'ROLE_MISMATCH', severity:'blocking', message:`${record.model} is ${record.kind}, requested appliance kind is ${ctx.kind}.` });
    return issues;
  }
  const c = record.compatibility;
  let verifiedChecks = 0;

  if (ctx.nicheWidthMm != null) {
    if (c?.nicheWidthMm != null) {
      verifiedChecks++;
      if (ctx.nicheWidthMm !== c.nicheWidthMm) issues.push({ code:'NICHE_WIDTH_MISMATCH', severity:'blocking', message:`Niche width ${ctx.nicheWidthMm} mm does not match verified ${c.nicheWidthMm} mm.` });
    } else if (c?.nicheWidthRangeMm) {
      verifiedChecks++;
      if (!inRange(ctx.nicheWidthMm,c.nicheWidthRangeMm)) issues.push({ code:'NICHE_WIDTH_MISMATCH', severity:'blocking', message:`Niche width ${ctx.nicheWidthMm} mm is outside verified ${c.nicheWidthRangeMm[0]}–${c.nicheWidthRangeMm[1]} mm.` });
    }
  }
  if (ctx.nicheHeightMm != null) {
    if (c?.nicheHeightMm != null) {
      verifiedChecks++;
      if (ctx.nicheHeightMm !== c.nicheHeightMm) issues.push({ code:'NICHE_HEIGHT_MISMATCH', severity:'blocking', message:`Niche height ${ctx.nicheHeightMm} mm does not match verified ${c.nicheHeightMm} mm.` });
    } else if (c?.nicheHeightRangeMm) {
      verifiedChecks++;
      if (!inRange(ctx.nicheHeightMm,c.nicheHeightRangeMm)) issues.push({ code:'NICHE_HEIGHT_MISMATCH', severity:'blocking', message:`Niche height ${ctx.nicheHeightMm} mm is outside verified ${c.nicheHeightRangeMm[0]}–${c.nicheHeightRangeMm[1]} mm.` });
    }
  }
  if (ctx.nicheDepthMm != null && c?.minNicheDepthMm != null) {
    verifiedChecks++;
    if (ctx.nicheDepthMm < c.minNicheDepthMm) issues.push({ code:'NICHE_TOO_SHALLOW', severity:'blocking', message:`Niche depth ${ctx.nicheDepthMm} mm is below verified minimum ${c.minNicheDepthMm} mm.` });
  }
  if (ctx.ventilationAreaCm2 != null && c?.minVentilationAreaCm2 != null) {
    verifiedChecks++;
    if (ctx.ventilationAreaCm2 < c.minVentilationAreaCm2) issues.push({ code:'VENTILATION_TOO_SMALL', severity:'blocking', message:`Ventilation ${ctx.ventilationAreaCm2} cm² is below verified minimum ${c.minVentilationAreaCm2} cm².` });
  }
  if (!verifiedChecks) {
    issues.push({ code:'INSUFFICIENT_VERIFIED_DATA', severity:'info', message:'No verified niche/installation dimension from the request can be checked against this appliance.' });
  }
  return issues;
}

function hardwareAlternatives(record: HardwareCatalogRecord, ctx: HardwareCompatibilityContext) {
  return allHardwareCatalogRecords()
    .filter(r => r.id !== record.id && r.role === ctx.role)
    .map(r => ({ r, issues: hardwareIssues(r,ctx) }))
    .filter(x => !x.issues.some(i=>i.severity==='blocking'))
    .map(x => ({ id:x.r.id, manufacturer:x.r.manufacturer, label:`${x.r.family}${x.r.code?` · ${x.r.code}`:''}`, score:scoreFrom(x.issues) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,5);
}

function applianceAlternatives(record: ApplianceCatalogRecord, ctx: ApplianceCompatibilityContext) {
  return allApplianceCatalogRecords()
    .filter(r => r.id !== record.id && r.kind === ctx.kind)
    .map(r => ({ r, issues: applianceIssues(r,ctx) }))
    .filter(x => !x.issues.some(i=>i.severity==='blocking'))
    .map(x => ({ id:x.r.id, manufacturer:x.r.manufacturer, label:x.r.model, score:scoreFrom(x.issues) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,5);
}

export function evaluateHardwareCompatibility(record: HardwareCatalogRecord, ctx: HardwareCompatibilityContext): CatalogCompatibilityResult<HardwareCatalogRecord> {
  const issues=hardwareIssues(record,ctx);
  return { record, status:statusFrom(issues), issues, score:scoreFrom(issues), alternatives:hardwareAlternatives(record,ctx) };
}

export function evaluateApplianceCompatibility(record: ApplianceCatalogRecord, ctx: ApplianceCompatibilityContext): CatalogCompatibilityResult<ApplianceCatalogRecord> {
  const issues=applianceIssues(record,ctx);
  return { record, status:statusFrom(issues), issues, score:scoreFrom(issues), alternatives:applianceAlternatives(record,ctx) };
}

export function evaluateHardwareCatalogId(id:string, ctx:HardwareCompatibilityContext) {
  const record=allHardwareCatalogRecords().find(r=>r.id===id);
  if(!record) return undefined;
  return evaluateHardwareCompatibility(record,ctx);
}

export function evaluateApplianceCatalogId(id:string, ctx:ApplianceCompatibilityContext) {
  const record=allApplianceCatalogRecords().find(r=>r.id===id);
  if(!record) return undefined;
  return evaluateApplianceCompatibility(record,ctx);
}
