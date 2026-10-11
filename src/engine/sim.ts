// Synthetic payment-lifecycle simulator. No network, no real credentials.
import { createHmac } from 'node:crypto';
export const SECRET = 'whsec_synthetic_test_only';
// Documented legal DIRECT transitions. Policy: an event is applied iff seq > current seq AND
// its target state is REACHABLE from the current state (a skipped intermediate event is assumed delayed).
export const LEGAL = { created:['authorized','failed'], authorized:['captured','failed'], captured:['refunded'], failed:[], refunded:[] };
export const direct = (a,b) => LEGAL[a].includes(b);
export const reach = (a,b) => a!==b && LEGAL[a].some(n => n===b || reach(n,b));
const sigOf = e => createHmac('sha256',SECRET).update(`${e.id}|${e.paymentId}|${e.type}|${e.seq}|${e.snapshot.status}`).digest('hex');
export const verify = e => typeof e.signature==='string' && e.signature===sigOf(e); // real HMAC check
const TYPE = { authorized:'payment.authorized', captured:'payment.captured', failed:'payment.failed', refunded:'payment.refunded' };
// createdAt = seq*1000 (event creation time); delivery order = position in plan; processing = env.log
export interface Ev{id:string;paymentId:string;orderId:string;type:string;seq:number;createdAt:number;snapshot:{status:string};signature?:string}
export interface Delivery{event:Ev;fault?:string}
export interface Violation{inv:string;msg:string}
export function makeEvent(pid,status,seq,{badSig=false,noSig=false}={}) {
  const e:Ev={id:`evt_${pid}_${seq}`,paymentId:pid,orderId:`order_${pid}`,type:TYPE[status],seq,createdAt:seq*1000,snapshot:{status}};
  if(!noSig) e.signature = badSig ? '0'.repeat(64) : sigOf(e);
  return e;
}
export class Env {
  payments:Record<string,{status:string;seq:number}>={};processed=new Set<string>();fulfilled=new Set<string>();lastEventId:string|null=null;log:any[]=[];cur:{n:number;attempt:number;fault?:string}|null=null;
  constructor(){this.payments={};this.processed=new Set();this.fulfilled=new Set();this.lastEventId=null;this.log=[];this.cur=null;}
  fault(pt){ if(this.cur?.fault===pt && this.cur!.attempt===1) throw new Error('TEMP_FAILURE@'+pt); }
  get(pid){ return this.payments[pid] ?? {status:'created',seq:0}; }
  commit(e,to){ const p=this.get(e.paymentId);
    this.log.push({k:'apply',eventId:e.id,seq:e.seq,prevSeq:p.seq,from:p.status,to,sigOk:verify(e),delivery:this.cur!.n});
    this.payments[e.paymentId]={status:to,seq:e.seq}; }
  fulfill(e){ this.log.push({k:'fulfill',eventId:e.id,orderId:e.orderId,sigOk:verify(e),delivery:this.cur!.n,attempt:this.cur!.attempt}); this.fulfilled.add(e.orderId); }
  reject(e,why){ this.log.push({k:'reject',eventId:e.id,why,delivery:this.cur!.n}); }
  tx(fn){ const s={p:structuredClone(this.payments),pr:new Set(this.processed),f:new Set(this.fulfilled),l:this.log.length};
    try{return fn();}catch(x){this.payments=s.p;this.processed=s.pr;this.fulfilled=s.f;this.log.length=s.l;throw x;} }
}
// plan = [{event, fault?:'pre'|'mid'}]; a faulted first attempt throws, sender retries immediately (max 3 attempts).
export function run(handler:(env:Env,e:Ev)=>any,plan:Delivery[]){
  const env=new Env();
  plan.forEach((d,n)=>{ for(let a=1;a<=3;a++){ env.cur={n,attempt:a,fault:d.fault};
    try{handler(env,d.event);break;}catch(x){ if(!String(x.message).startsWith('TEMP_FAILURE'))throw x;
      env.log.push({k:'fail',eventId:d.event.id,delivery:n,attempt:a}); } } });
  return env;
}
