import{spawnSync}from'node:child_process';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{dirname}from'node:path';import ts from'typescript';
// The recovered 5.6 tree has pre-existing type errors and out-of-sync CAD builds.
// Typecheck the new boundary, then emit ONLY the four changed Office modules.
// Preserve every unrelated prebuilt engineering/production artifact.
const r=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--strict','--noEmit','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--types','node','apps/core-api/src/smm-service.ts'],{stdio:'inherit'});if(r.status)process.exit(r.status);
for(const name of ['server','owner-operations-store','supabase-owner-operations-store','smm-service']){const file='apps/core-api/src/'+name+'.ts';const out='dist/apps/core-api/src/'+name+'.js';const result=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,esModuleInterop:true}});mkdirSync(dirname(out),{recursive:true});writeFileSync(out,result.outputText)}
