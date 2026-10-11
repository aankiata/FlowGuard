// HTTP adapter contract for a merchant webhook target (any language can implement it):
//   POST /reset    -> clears state
//   POST /webhook  -> body {event, fault, attempt, n}; 2xx = processed, 5xx = retry. `fault` ('pre'|'mid') asks the
//                     target to fail the first attempt at that point (needs a test-mode hook; the one instrumentation requirement)
//   GET  /audit    -> {log:[apply|fulfill|reject|fail entries], payments:{id:{status,seq}}}
import http from 'node:http'; import { Env } from '../engine/sim.js'; import { HANDLERS } from '../engine/handlers.js';
// Reference/defective targets served over real HTTP (still the prototype's own handlers; proves the transport + contract).
export function startServer(hid){const env=new Env();
  const srv=http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{
    const j=o=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(o));};
    if(req.url==='/reset'){Object.assign(env,new Env());return j({ok:1});}
    if(req.url==='/audit')return j({log:env.log,payments:env.payments});
    if(req.url==='/webhook'){const {event,fault,attempt,n}=JSON.parse(b);env.cur={n,attempt,fault};
      try{HANDLERS[hid](env,event);return j({ok:1});}
      catch(x){if(String(x.message).startsWith('TEMP_FAILURE')){env.log.push({k:'fail',eventId:event.id,delivery:n,attempt});res.statusCode=503;return j({error:'temporary'});}res.statusCode=500;return j({error:String(x)});}}
    res.statusCode=404;j({});});});
  return new Promise(r=>srv.listen(0,'127.0.0.1',()=>r({close:()=>new Promise(c=>srv.close(c)),url:`http://127.0.0.1:${(srv.address() as any).port}`})));}
const post=(u:string,p:string,body?:any)=>fetch(u+p,{method:'POST',body:JSON.stringify(body??{})});
export async function httpRun(url,plan){await post(url,'/reset');
  for(let n=0;n<plan.length;n++)for(let a=1;a<=3;a++){const r=await post(url,'/webhook',{event:plan[n].event,fault:plan[n].fault,attempt:a,n});if(r.status<500)break;}
  const a=await(await fetch(url+'/audit')).json();return {log:a.log,get:pid=>a.payments[pid]??{status:'created',seq:0}};}
