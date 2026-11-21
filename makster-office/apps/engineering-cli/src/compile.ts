import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { FixtureManufacturingDataProvider, ImportedManufacturingDataProvider, MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../../../packages/bxf-intelligence/src/index.js';
import type { ProjectModelV1 } from '../../../packages/project-model/src/index.js';

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mm10(value: number): string { return (value / 10).toFixed(1); }

const args = process.argv.slice(2);
const fixtureManufacturingData = args.includes('--fixture-manufacturing-data');
const bxfIndex = args.indexOf('--bxf');
const bxfPathArg = bxfIndex >= 0 ? args[bxfIndex + 1] : undefined;
const positional = args.filter((arg, index) => arg !== '--fixture-manufacturing-data' && arg !== '--bxf' && !(bxfIndex >= 0 && index === bxfIndex + 1));
const input = positional[0];
const outputArg = positional[1];
if (!input) {
  console.error('Usage: node compile.js <project.json> [output-dir] [--fixture-manufacturing-data | --bxf <file.bxf>]');
  process.exit(2);
}

const inputPath = resolve(input);
const outputDir = resolve(outputArg ?? join(process.cwd(), 'engineering-output', basename(input, '.json')));
const project = JSON.parse(await readFile(inputPath, 'utf8')) as ProjectModelV1;
let bxfReport: ReturnType<typeof inspectBxf> | undefined;
let manufacturingProvider = fixtureManufacturingData ? new FixtureManufacturingDataProvider() : undefined;
if (bxfPathArg) {
  const bxfXml = await readFile(resolve(bxfPathArg), 'utf8');
  bxfReport = inspectBxf({ fileName: basename(bxfPathArg), xml: bxfXml, adapters: [new MaksterFixtureBxfAdapter()] });
  const profiles = bxfReport.adapter?.manufacturingProfiles ?? [];
  if (profiles.length > 0) manufacturingProvider = new ImportedManufacturingDataProvider(profiles);
}
const result = new MaksterEngineeringCompiler(manufacturingProvider).compile(project);
await mkdir(outputDir, { recursive: true });
if (bxfReport) await writeFile(join(outputDir, 'bxf-import-report.json'), JSON.stringify(bxfReport, null, 2));

await writeFile(join(outputDir, 'engineering.json'), JSON.stringify(result, null, 2));

const cutlistRows = [
  ['part_id','name','kind','qty','length_mm','width_mm','thickness_mm','material_selection_id','grain','estimated','edges'],
  ...result.parts.map((part) => [
    part.id, part.name, part.kind, part.quantity, mm10(Number(part.length)), mm10(Number(part.width)), mm10(Number(part.thickness)),
    part.materialSelectionId ?? '', part.grainDirection, part.estimated,
    part.edges.map((edge) => `${edge.side}:${edge.thickness ? mm10(Number(edge.thickness))+'mm' : ''}${edge.materialSelectionId ? ':'+edge.materialSelectionId : ''}`).join('|'),
  ]),
];
await writeFile(join(outputDir, 'cutlist.csv'), cutlistRows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');

const hardwareRows = [
  ['requirement_id','name','role','qty','unit','length_mm','hardware_selection_id','estimated','note'],
  ...result.hardware.map((item) => [
    item.id, item.name, item.role, item.quantity, item.unit, item.length ? mm10(Number(item.length)) : '',
    item.hardwareSelectionId ?? '', item.estimated, item.note ?? '',
  ]),
];
await writeFile(join(outputDir, 'hardware.csv'), hardwareRows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');


const machiningRows = [
  ['operation_id','kind','target_part_id','face','x_mm','y_mm','diameter_mm','depth_mm','length_mm','tool_width_mm','verification_source','manufacturer','hardware_code','catalog_version','source_sha256','schema_fingerprint','adapter_id','hardware_selection_id','estimated','reference','note'],
  ...result.machining.map((op) => [
    op.id, op.kind, op.targetPartId, op.face, mm10(Number(op.x)), mm10(Number(op.y)),
    op.diameter ? mm10(Number(op.diameter)) : '', op.depth ? mm10(Number(op.depth)) : '',
    op.length ? mm10(Number(op.length)) : '', op.toolWidth ? mm10(Number(op.toolWidth)) : '', op.verificationSource ?? '',
    op.verificationDetail?.manufacturer ?? '', op.verificationDetail?.hardwareCode ?? '', op.verificationDetail?.catalogVersion ?? '',
    op.verificationDetail?.sourceChecksumSha256 ?? '', op.verificationDetail?.schemaFingerprint ?? '', op.verificationDetail?.adapterId ?? '',
    op.hardwareSelectionId ?? '', op.estimated, op.reference ?? '', op.note ?? '',
  ]),
];
await writeFile(join(outputDir, 'machining.csv'), machiningRows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');

const issueRows = [
  ['issue_id','severity','category','code','message','furniture_id','module_id','target_id'],
  ...result.issues.map((item) => [
    item.id, item.severity, item.category, item.code, item.message, item.furnitureId ?? '', item.moduleId ?? '', item.targetId ?? '',
  ]),
];
await writeFile(join(outputDir, 'issues.csv'), issueRows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');
const cncRows = [
  ['code','message','target_id','hardware_selection_id'],
  ...result.cncRelease.blockers.map((item) => [item.code, item.message, item.targetId ?? '', item.hardwareSelectionId ?? '']),
];
await writeFile(join(outputDir, 'cnc-blockers.csv'), cncRows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');


console.log(JSON.stringify({
  ok: true,
  projectId: result.projectId,
  revision: result.revision,
  readyForProduction: result.readyForProduction,
  cncReady: result.cncReady,
  panelPartCount: result.stats.panelPartCount,
  machiningOperationCount: result.stats.machiningOperationCount,
  blocking: result.checks.blocking,
  cncBlockers: result.cncRelease.blockers.length,
  fixtureManufacturingData,
  bxfStatus: bxfReport?.status ?? null,
  bxfAdapter: bxfReport?.adapter?.adapterId ?? null,
  outputDir,
}, null, 2));
