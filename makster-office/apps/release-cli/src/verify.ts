import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { verifyReleasePackageFiles, type CncReleaseManifest } from '../../../packages/manufacturing-release/src/index.js';

const dir = resolve(process.argv[2] ?? '');
if (!process.argv[2]) { console.error('Usage: node verify.js <release-dir> [public-key.pem]'); process.exit(2); }
const manifest = JSON.parse(await readFile(join(dir, 'release-manifest.json'), 'utf8')) as CncReleaseManifest;
const files: Record<string, string> = {};
for (const file of manifest.files) files[file.name] = await readFile(join(dir, file.name), 'utf8');
const keyPath = process.argv[3] ? resolve(process.argv[3]) : join(dir, 'release-public-key.pem');
let publicKey: string | undefined;
try { publicKey = await readFile(keyPath, 'utf8'); } catch { /* unsigned or external key */ }
const result = verifyReleasePackageFiles(manifest, files, publicKey);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
