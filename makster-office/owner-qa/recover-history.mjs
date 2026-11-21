// Recover only existing marketing exports. No CAD, production, procurement or project bridge.
import ts from '../node_modules/typescript/lib/typescript.js';
import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';
const source=readFileSync(new URL('../dist/packages/owner-operations/src/makster-ai-office.js',import.meta.url),'utf8');
const tree=ts.createSourceFile('history.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=new Set(['MAKSTER_OFFICE_AGENTS','nowIso','createOfficeCampaign','createOfficeApproval','runMaksterOfficeCycle']);
const nodes=tree.statements.filter(n=>names.has(n.name?.text)||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(tree))));
const out='// Recovered verbatim marketing-only exports from Makster AI 5.6.\n// Source SHA256: '+createHash('sha256').update(source).digest('hex')+'\n'+nodes.map(n=>n.getText(tree)).join('\n\n')+'\n';
const target=new URL('./edge/marketing-history.mjs',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==out)throw Error('Historical marketing exports diverged');console.log('Historical marketing exports: byte-exact PASS');}else writeFileSync(target,out);
