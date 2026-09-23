import http from "node:http";
const port=Number(process.env.PORT||3000);
const json=(res,status,body)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(body));};
const route=(capability,complexity,externalAllowed=true)=>{
 if(["stt","tts","action"].includes(capability)&&complexity<=1)return{tier:"vyta_small",provider:"vyta",reason:"low_complexity"};
 if(complexity<=2)return{tier:"vyta_small",provider:"vyta",reason:"default_self_host"};
 if(complexity<=4)return{tier:"vyta_large",provider:"vyta",reason:"complex_self_host"};
 if(externalAllowed)return{tier:"external_frontier",provider:"external",reason:"frontier_required"};
 return{tier:"vyta_large",provider:"vyta",reason:"external_disabled"};
};
const server=http.createServer((req,res)=>{
 if(req.method==="GET"&&req.url==="/health")return json(res,200,{ok:true,service:"vyta-runtime",version:"0.1.0"});
 if(req.method==="GET"&&req.url==="/")return json(res,200,{service:"VYTA Runtime",version:"0.1.0",policy:"self-host-first"});
 if(req.method==="POST"&&req.url==="/v1/route"){
  let raw="";req.on("data",c=>raw+=c);req.on("end",()=>{try{
   const b=JSON.parse(raw||"{}"); const allowed=["realtime","stt","tts","reasoning","action"];
   if(!allowed.includes(b.capability))return json(res,400,{error:"invalid_capability"});
   const complexity=Math.max(1,Math.min(5,Number(b.complexity??2)));
   return json(res,200,{runtime:"VYTA Runtime 0.1",execute:false,selected:route(b.capability,complexity,b.external_frontier_enabled!==false)});
  }catch{return json(res,400,{error:"invalid_json"});}});
  return;
 }
 json(res,404,{error:"not_found"});
});
server.listen(port,"0.0.0.0",()=>console.log("VYTA Runtime listening",port));