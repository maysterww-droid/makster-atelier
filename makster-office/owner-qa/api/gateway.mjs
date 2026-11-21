// Vercel Deployment Protection authenticates ALL files and this API before invocation.
// Only a branch-scoped server token is forwarded. No Supabase service key leaves Supabase.
export default async function handler(req,res){
 const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));};
 if(process.env.VERCEL_ENV!=='preview'||!process.env.MAKSTER_QA_BRIDGE_TOKEN)return send(503,{error:'PROTECTED_QA_PREVIEW_ONLY'});
 const u=new URL(req.url,'https://qa.invalid'),raw=req.query?.route??u.searchParams.get('route');
 const route=Array.isArray(raw)?raw.join('/'):String(raw||'');
 const full=route.startsWith('api/')?'/'+route:'/api/'+route;
 if(req.method==='GET'&&full==='/api/v1/projects')return send(200,[]);
 if(req.method==='GET'&&full==='/api/v1/health')return send(200,{version:'6.0.1 · Owner QA',visualProduct:'2.6.1',externalExecution:'OFF'});
 if(!full.startsWith('/api/v1/smm/'))return send(403,{error:'LEGACY_API_NOT_EXPOSED_IN_SMM_QA'});
 const path=full.slice('/api/v1/smm'.length);
 if(!['GET','POST'].includes(req.method))return send(405,{error:'METHOD_DISABLED'});
 if(req.method==='POST'){
  if(req.headers['x-makster-smm']!=='1')return send(403,{error:'SMM_CLIENT_HEADER_REQUIRED'});
  let origin;try{origin=new URL(req.headers.origin).host;}catch{return send(403,{error:'SAME_ORIGIN_REQUIRED'});}
  if(origin!==req.headers.host)return send(403,{error:'SAME_ORIGIN_REQUIRED'});
 }
 try{const r=await fetch('https://gkqntgfrbngspvrsqvmx.supabase.co/functions/v1/makster-office-qa601?route='+encodeURIComponent(path),{method:req.method,headers:{'content-type':'application/json','x-makster-bridge':process.env.MAKSTER_QA_BRIDGE_TOKEN,'idempotency-key':String(req.headers['idempotency-key']||'')},...(req.method==='POST'?{body:JSON.stringify(req.body||{})}:{}),signal:AbortSignal.timeout(30000)});
  const data=await r.json();return send(r.status,data);
 }catch{return send(503,{error:'QA_BACKEND_UNAVAILABLE'});}
}
