import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ImportedManufacturingDataProvider, MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../../../packages/bxf-intelligence/src/index.js';
import { buildProductionPack } from '../../../packages/production-pack/src/index.js';
const [, , projectPath, outputPath, ...args] = process.argv;
if (!projectPath || !outputPath) {
    console.error('Usage: production-pack <project.json> <output-dir> --manual | --outsource cutting_only|cutting_edging|cutting_edging_drilling [--bxf file]');
    process.exit(2);
}
const route = args.includes('--manual') ? 'manual_workshop' : 'outsource';
const outsourceIndex = args.indexOf('--outsource');
const preset = (outsourceIndex >= 0 ? args[outsourceIndex + 1] : undefined);
const bxfIndex = args.indexOf('--bxf');
const bxfPath = bxfIndex >= 0 ? args[bxfIndex + 1] : undefined;
const project = JSON.parse(await readFile(resolve(projectPath), 'utf8'));
let compiler = new MaksterEngineeringCompiler();
if (bxfPath) {
    const xml = await readFile(resolve(bxfPath), 'utf8');
    const report = inspectBxf({ fileName: bxfPath, xml, adapters: [new MaksterFixtureBxfAdapter()] });
    const profiles = report.adapter?.manufacturingProfiles ?? [];
    if (profiles.length)
        compiler = new MaksterEngineeringCompiler(new ImportedManufacturingDataProvider(profiles));
}
const engineering = compiler.compile(project);
const pack = buildProductionPack({ project, engineering, route, ...(route === 'outsource' ? { outsourcePreset: preset ?? 'cutting_edging_drilling' } : {}) });
await mkdir(resolve(outputPath), { recursive: true });
for (const [name, content] of Object.entries(pack.files))
    await writeFile(resolve(outputPath, name), content, 'utf8');
console.log(JSON.stringify(pack.manifest, null, 2));
process.exit(pack.manifest.ready ? 0 : 3);
