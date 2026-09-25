import http from "node:http";
const port=Number(process.env.PORT||3000);
const runtimeSecret=process.env.VYTA_RUNTIME_SHARED_SECRET||"";
const adapters={
 stt:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external",status:"benchmark_ready",protocol:"openai_compatible_http",endpoint_env:"VYTA_STT_BASE_URL",model_env:"VYTA_STT_MODEL"},
 tts:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external"},
 reasoning:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external"}
};
const json=(res,status,body)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(body));};
const route=(capability,complexity,externalAllowed=true)=>{
 if(["stt","tts","action"].includes(capability)&&complexity<=1)return{tier:"vyta_small",provider:"vyta",reason:"low_complexity"};
 if(complexity<=2)return{tier:"vyta_small",provider:"vyta",reason:"default_self_host"};
 if(complexity<=4)return{tier:"vyta_large",provider:"vyta",reason:"complex_self_host"};
 if(externalAllowed)return{tier:"external_frontier",provider:"external",reason:"frontier_required"};
 return{tier:"vyta_large",provider:"vyta",reason:"external_disabled"};
};
http.createServer((req,res)=>{
 if(req.method==="GET"&&req.url==="/health")return json(res,200,{ok:true,service:"vyta-runtime",version:"0.1.0"});
 if(req.method==="GET"&&req.url==="/")return json(res,200,{service:"VYTA Runtime",version:"0.1.0",policy:"self-host-first"});
 if(req.method==="GET"&&req.url==="/v1/adapters")return json(res,200,{runtime:"VYTA Runtime 0.1",execute:false,adapters});
 if(req.method==="GET"&&req.url==="/v1/stt/status")return json(res,200,{adapter:"stt",mode:"benchmark",configured:Boolean(process.env.VYTA_STT_BASE_URL),model:process.env.VYTA_STT_MODEL||null,execute:false});
 if(req.method==="POST"&&req.url==="/v1/stt/transcribe"){
  if(!runtimeSecret)return json(res,503,{error:"runtime_secret_not_configured"});
  const supplied=req.headers["x-vyta-runtime-secret"]||"";
  if(supplied!==runtimeSecret)return json(res,401,{error:"unauthorized"});
  const base=process.env.VYTA_STT_BASE_URL||"";
  if(!base)return json(res,503,{error:"stt_backend_not_configured",mode:"benchmark"});
  const started=Date.now();
  const chunks=[];
  req.on("data",chunk=>chunks.push(chunk));
  req.on("end",async()=>{try{
   const upstream=await fetch(base+"/v1/audio/transcriptions",{method:"POST",headers:{"content-type":req.headers["content-type"]||"application/octet-stream"},body:Buffer.concat(chunks),signal:AbortSignal.timeout(30000)});
   const body=await upstream.text();
   res.writeHead(upstream.status,{"content-type":upstream.headers.get("content-type")||"application/json","x-vyta-stt-latency-ms":String(Date.now()-started),"x-vyta-stt-provider":"self_hosted"});
   res.end(body);
  }catch(e){return json(res,502,{error:"stt_backend_unavailable",detail:e instanceof Error?e.name:"unknown",latency_ms:Date.now()-started});}});
  return;
 }
 if(req.method==="POST"&&req.url==="/v1/route"){
  if(!runtimeSecret)return json(res,503,{error:"runtime_secret_not_configured"});
  const supplied=req.headers["x-vyta-runtime-secret"]||"";
  if(supplied!==runtimeSecret)return json(res,401,{error:"unauthorized"});
  let raw="";
  req.on("data",chunk=>raw+=chunk);
  req.on("end",()=>{try{
   const b=JSON.parse(raw||"{}");
   const allowed=["realtime","stt","tts","reasoning","action"];
   if(!allowed.includes(b.capability))return json(res,400,{error:"invalid_capability"});
   const complexity=Math.max(1,Math.min(5,Number(b.complexity??2)));
   return json(res,200,{runtime:"VYTA Runtime 0.1",execute:false,selected:route(b.capability,complexity,b.external_frontier_enabled!==false)});
  }catch{return json(res,400,{error:"invalid_json"});}});
  return;
 }
 json(res,404,{error:"not_found"});
}).listen(port,"0.0.0.0",()=>console.log("VYTA Runtime listening",port));
