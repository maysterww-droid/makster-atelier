import http from "node:http";
const port=Number(process.env.PORT||3000);
const runtimeSecret=process.env.VYTA_RUNTIME_SHARED_SECRET||"";
const adapters={
 stt:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external",status:"benchmark_ready",protocol:"openai_compatible_http",endpoint_env:"VYTA_STT_BASE_URL",model_env:"VYTA_STT_MODEL"},
 tts:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external"},
 reasoning:{kind:"provider_adapter",preferred:"vyta_self_hosted",fallback:"external"}
};
const json=(res,status,body)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(body));};
const authorized=req=>runtimeSecret&&((req.headers["x-vyta-runtime-secret"]||"")===runtimeSecret);
const route=(capability,complexity,externalAllowed=true)=>{
 if(["stt","tts","action"].includes(capability)&&complexity<=1)return{tier:"vyta_small",provider:"vyta",reason:"low_complexity"};
 if(complexity<=2)return{tier:"vyta_small",provider:"vyta",reason:"default_self_host"};
 if(complexity<=4)return{tier:"vyta_large",provider:"vyta",reason:"complex_self_host"};
 if(externalAllowed)return{tier:"external_frontier",provider:"external",reason:"frontier_required"};
 return{tier:"vyta_large",provider:"vyta",reason:"external_disabled"};
};
async function transcribeBytes(res,bytes,contentType,started){
 const base=(process.env.VYTA_STT_BASE_URL||"").replace(/\/$/,"");
 if(!base)return json(res,503,{error:"stt_backend_not_configured",mode:"benchmark"});
 try{
  const upstream=await fetch(base+"/v1/audio/transcriptions",{method:"POST",headers:{"content-type":contentType},body:bytes,signal:AbortSignal.timeout(120000)});
  const body=await upstream.text();
  res.writeHead(upstream.status,{"content-type":upstream.headers.get("content-type")||"application/json","x-vyta-stt-latency-ms":String(Date.now()-started),"x-vyta-stt-provider":"self_hosted"});
  res.end(body);
 }catch(e){json(res,502,{error:"stt_backend_unavailable",detail:e instanceof Error?e.name:"unknown",latency_ms:Date.now()-started});}
}
http.createServer((req,res)=>{
 if(req.method==="GET"&&req.url==="/health")return json(res,200,{ok:true,service:"vyta-runtime",version:"0.1.1"});
 if(req.method==="GET"&&req.url==="/")return json(res,200,{service:"VYTA Runtime",version:"0.1.1",policy:"self-host-first"});
 if(req.method==="GET"&&req.url==="/v1/adapters")return json(res,200,{runtime:"VYTA Runtime 0.1",execute:false,adapters});
 if(req.method==="GET"&&req.url==="/v1/stt/status")return json(res,200,{adapter:"stt",mode:"benchmark",configured:Boolean(process.env.VYTA_STT_BASE_URL),model:process.env.VYTA_STT_MODEL||null,execute:true});
 if(req.method==="POST"&&req.url==="/v1/stt/transcribe"){
  if(!runtimeSecret)return json(res,503,{error:"runtime_secret_not_configured"});
  if(!authorized(req))return json(res,401,{error:"unauthorized"});
  const started=Date.now(),chunks=[];
  req.on("data",chunk=>chunks.push(chunk));
  req.on("end",()=>transcribeBytes(res,Buffer.concat(chunks),req.headers["content-type"]||"application/octet-stream",started));
  return;
 }
 if(req.method==="POST"&&req.url==="/v1/stt/benchmark"){
  if(!runtimeSecret)return json(res,503,{error:"runtime_secret_not_configured"});
  if(!authorized(req))return json(res,401,{error:"unauthorized"});
  let raw="";
  req.on("data",chunk=>raw+=chunk);
  req.on("end",async()=>{const started=Date.now();try{
   const b=JSON.parse(raw||"{}"),source=String(b.audio_url||"");
   if(!/^https:\/\//i.test(source))return json(res,400,{error:"invalid_audio_url"});
   const host=new URL(source).hostname.toLowerCase();
   const allowed=["dnznrvs05pmza.cloudfront.net","runwayml.com","www.runwayml.com"];
   if(!allowed.some(x=>host===x||host.endsWith("."+x)))return json(res,400,{error:"audio_host_not_allowed"});
   const audio=await fetch(source,{signal:AbortSignal.timeout(30000),redirect:"follow"});
   if(!audio.ok)return json(res,502,{error:"audio_fetch_failed",status:audio.status});
   const bytes=Buffer.from(await audio.arrayBuffer());
   if(bytes.length>25*1024*1024)return json(res,413,{error:"audio_too_large"});
   const filename=String(b.filename||"benchmark.mp3").replace(/[^a-zA-Z0-9._-]/g,"_");
   const model=String(b.model||process.env.VYTA_STT_MODEL||"Systran/faster-distil-whisper-large-v3");
   const fd=new FormData();
   fd.append("file",new Blob([bytes],{type:audio.headers.get("content-type")||"audio/mpeg"}),filename);
   fd.append("model",model);
   const request=new Request("http://local",{method:"POST",body:fd});
   const payload=Buffer.from(await request.arrayBuffer());
   return transcribeBytes(res,payload,request.headers.get("content-type"),started);
  }catch(e){return json(res,502,{error:"benchmark_failed",detail:e instanceof Error?e.message:"unknown",latency_ms:Date.now()-started});}});
  return;
 }
 if(req.method==="POST"&&req.url==="/v1/route"){
  if(!runtimeSecret)return json(res,503,{error:"runtime_secret_not_configured"});
  if(!authorized(req))return json(res,401,{error:"unauthorized"});
  let raw="";
  req.on("data",chunk=>raw+=chunk);
  req.on("end",()=>{try{
   const b=JSON.parse(raw||"{}"),allowed=["realtime","stt","tts","reasoning","action"];
   if(!allowed.includes(b.capability))return json(res,400,{error:"invalid_capability"});
   const complexity=Math.max(1,Math.min(5,Number(b.complexity??2)));
   return json(res,200,{runtime:"VYTA Runtime 0.1",execute:false,selected:route(b.capability,complexity,b.external_frontier_enabled!==false)});
  }catch{return json(res,400,{error:"invalid_json"});}});
  return;
 }
 json(res,404,{error:"not_found"});
}).listen(port,"0.0.0.0",()=>console.log("VYTA Runtime listening",port));
