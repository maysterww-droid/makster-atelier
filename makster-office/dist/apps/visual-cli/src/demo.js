import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyVisualCommand, buildVisualScene } from '../../../packages/visual-product/src/index.js';
import { MaksterEngineeringCompiler } from '../../../packages/engineering-engine/src/index.js';
const out = resolve(process.argv[2] ?? 'engineering-output/visual-product-demo');
await mkdir(out, { recursive: true });
let project = JSON.parse(await readFile(resolve('packages/project-model/examples/wardrobe.blum.v1.json'), 'utf8'));
// The golden fixture already references a room. Replace that room through a typed visual command.
const commands = [
    { type: 'set_room_dimensions', roomIndex: 0, widthMm: 4400, depthMm: 3800, heightMm: 2750 },
    { type: 'set_furniture_position', xMm: 450, yMm: 120, zMm: 0, rotationZDeg: 0 },
    { type: 'set_carcass_thickness', thicknessMm: 19 },
    { type: 'set_furniture_wall_clearance', wall: 'left', clearanceMm: 450 },
    { type: 'move_module_divider', leftModuleIndex: 2, deltaMm: 60 },
    { type: 'set_style_note', colorNote: 'Cashmere / warm beige', finishNote: 'matte' },
];
const log = [];
for (const command of commands) {
    project = applyVisualCommand(project, command);
    log.push({ revision: project.revision, command });
}
const scene = buildVisualScene(project);
const engineering = new MaksterEngineeringCompiler().compile(project);
await writeFile(resolve(out, 'visual-project.json'), JSON.stringify(project, null, 2));
await writeFile(resolve(out, 'visual-scene.json'), JSON.stringify(scene, null, 2));
await writeFile(resolve(out, 'visual-edit-log.json'), JSON.stringify(log, null, 2));
await writeFile(resolve(out, 'engineering-summary.json'), JSON.stringify({ readyForProduction: engineering.readyForProduction, cncReady: engineering.cncReady, stats: engineering.stats, checks: engineering.checks, issues: engineering.issues }, null, 2));
console.log(JSON.stringify({ projectId: project.projectId, revision: project.revision, room: scene.room, furniture: scene.furniture[0], engineering: { readyForProduction: engineering.readyForProduction, cncReady: engineering.cncReady, parts: engineering.stats.panelPartCount, blocking: engineering.checks.blocking } }, null, 2));
