import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../../../packages/bxf-intelligence/src/index.js';
const input = process.argv[2];
const output = process.argv[3];
if (!input) {
    console.error('Usage: node dist/apps/bxf-cli/src/inspect.js <file.bxf|xml> [report.json]');
    process.exit(2);
}
const xml = await readFile(input, 'utf8');
const report = inspectBxf({ fileName: basename(input), xml, adapters: [new MaksterFixtureBxfAdapter()] });
const json = JSON.stringify(report, null, 2);
if (output)
    await writeFile(output, json + '\n');
else
    console.log(json);
