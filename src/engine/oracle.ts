import { verify, reach, type Delivery, type Violation } from './sim.js';
const ORDER=['INV4','INV5','INV1','INV2','INV6','INV3'];
export const NAMES={INV1:'Idempotent processing',INV2:'State monotonicity',INV3:'Fulfillment correctness',INV4:'Signature validation',INV5:'Retry safety',INV6:'Valid lifecycle transitions'};
// Deterministic oracle: checks the handler's execution log against documented invariants, and final state
// against an independent spec fold (authentic events deduped, sorted by seq, applied under the documented rule).
export function check(plan:Delivery[],env:any){
  const v:Violation[]=[],push=(inv,msg)=>v.push({inv,msg});
  for(const l of env.log) if((l.k==='apply'||l.k==='fulfill')&&!l.sigOk) push('INV4',`${l.k} caused by unauthenticated event ${l.eventId}`);
  const byEv:Record<string,any[]>={},byOrd:Record<string,any[]>={};
  for(const l of env.log) if(l.k==='fulfill'){(byEv[l.eventId]??=[]).push(l);(byOrd[l.orderId]??=[]).push(l);}
  for(const [id,ls] of Object.entries(byEv)) if(ls.length>1) push(env.log.some(l=>l.k==='fail'&&l.eventId===id)?'INV5':'INV1',`event ${id} triggered fulfilment ${ls.length}x`);
  for(const [o,ls] of Object.entries(byOrd)) if(ls.length>1) push('INV3',`${o} fulfilled ${ls.length}x`);
  for(const l of env.log) if(l.k==='apply'&&l.seq<l.prevSeq) push('INV2',`${l.eventId} (seq ${l.seq}) overwrote newer state (seq ${l.prevSeq})`);
  const seen=new Set(),auth=plan.map(d=>d.event).filter(e=>verify(e)&&!seen.has(e.id)&&seen.add(e.id)).sort((a,b)=>a.seq-b.seq);
  const exp:Record<string,any>={}; for(const e of auth){const c=exp[e.paymentId]??={status:'created',seq:0}; if(e.seq>c.seq&&reach(c.status,e.snapshot.status)){c.status=e.snapshot.status;c.seq=e.seq;}}
  for(const pid of new Set<string>(plan.map(d=>d.event.paymentId))){const a=env.get(pid).status,x=(exp[pid]??{status:'created'}).status;
    if(a!==x) push('INV6',`${pid}: final state ${a}, expected ${x}`);}
  return v;
}
export const primary=v=>v.length?ORDER.find(i=>v.some(x=>x.inv===i)):null;
