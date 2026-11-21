import{mkdirSync,existsSync,writeFileSync,readFileSync}from'node:fs';import{randomBytes}from'node:crypto';import{resolve}from'node:path';
mkdirSync('.smm',{recursive:true});const path=resolve('.smm/owner-key.txt');if(!existsSync(path))writeFileSync(path,randomBytes(24).toString('hex'),{mode:0o600});
// QA cannot reach production, paid AI, ad executors or Gmail secrets inherited from a shell.
for(const key of Object.keys(process.env))if(/^(SUPABASE_|OPENAI_|GOOGLE_|MAKSTER_GROWTH_|MAKSTER_CONNECTION_)/.test(key))delete process.env[key];
process.env.MAKSTER_SMM_OWNER_KEY=readFileSync(path,'utf8').trim();process.env.MAKSTER_SMM_PREVIEW='1';process.env.MAKSTER_OWNER_OPERATIONS_STORE='file';process.env.MAKSTER_OWNER_OPERATIONS_FILE=resolve('.smm/owner-operations.json');process.env.MAKSTER_SMM_IMPORT_FILE=resolve('.smm/import.json');process.env.MAKSTER_BIND_HOST='0.0.0.0';process.env.PORT=process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:(process.env.PORT||'3000');
console.log('MAKSTER Office Owner QA · credentials: .smm/owner-key.txt · external execution OFF');await import('../dist/apps/core-api/src/server.js');
