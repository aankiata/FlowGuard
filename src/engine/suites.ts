import { makeEvent, type Delivery } from './sim.js';
const D=(pid:string,s:string,q:number,o:any={},f?:string)=>({event:makeEvent(pid,s,q,o),...(f?{fault:f}:{})});
// Suite A: conventional baseline. Hand-written, in the spirit of what an experienced payment engineer writes.
export const baselineSuite:Case[]=([
 ['happy path auth->capture',[D('p','authorized',1),D('p','captured',2)]],
 ['failed payment',[D('p','authorized',1),D('p','failed',2)]],
 ['capture then refund',[D('p','authorized',1),D('p','captured',2),D('p','refunded',3)]],
 ['adjacent duplicate captured',[D('p','authorized',1),D('p','captured',2),D('p','captured',2)]],
 ['ordinary retry (handler fails on receipt)',[D('p','authorized',1),D('p','captured',2,{},'pre')]],
 ['tampered signature rejected',[D('p','captured',2,{badSig:true})]],
 ['missing signature rejected',[D('p','captured',2,{noSig:true})]],
 ['captured delivered before authorized',[D('p','captured',2),D('p','authorized',1)]],
 ['illegal transition failed->captured',[D('p','authorized',1),D('p','failed',2),D('p','captured',3)]],
] as [string,Delivery[]][]).map(([name,plan],i)=>({id:`A${i+1}`,name,plan}));
function prng(a:number){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const CHAINS=[['authorized'],['authorized','captured'],['authorized','captured','refunded'],['failed'],['authorized','failed']];
// Suite B: seeded, bounded adversarial generator (shuffle, duplicates, faults at pre/mid points, tampering, illegal transitions).
export interface Case{id:string;name:string;plan:Delivery[]}
export function generate(seed:number,n:number,max=9):Case[]{
  const r=prng(seed),pick=(a:any[])=>a[Math.floor(r()*a.length)],out:Case[]=[];
  for(let i=0;i<n;i++){let ds:Delivery[]=[];const ends:[string,string[]][]=[];
    for(let k=0;k<(r()<0.3?2:1);k++){const c=pick(CHAINS),pid=`pay${i}${k}`;c.forEach((s,j)=>ds.push(D(pid,s,j+1)));ends.push([pid,c]);}
    for(let s=0;s<ds.length;s++) if(r()<0.4){const j=Math.floor(r()*ds.length);[ds[s],ds[j]]=[ds[j],ds[s]];}
    if(r()<0.2){const j=Math.floor(r()*ds.length),e=ds[j].event,o=r()<0.5?{badSig:true}:{noSig:true};
      const [s]=[e.snapshot.status]; ds[j]={event:makeEvent(e.paymentId,s,e.seq,o)};}
    for(let d=0;d<Math.floor(r()*3);d++) if(ds.length<max){ds.splice(Math.floor(r()*(ds.length+1)),0,{event:pick(ds).event});}
    if(r()<0.4){const j=Math.floor(r()*ds.length);ds[j]={...ds[j],fault:pick(['pre','mid'])};}
    const f=ends.find(([,c])=>c.at(-1)==='failed'); if(r()<0.15&&f&&ds.length<max) ds.push(D(f[0],'captured',f[1].length+1));
    out.push({id:`fg-${seed}-${i}`,name:`generated #${i}`,plan:ds});}
  return out;
}
