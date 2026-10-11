import { HANDLERS, META } from '../engine/handlers.js'; import { makeEvent, run } from '../engine/sim.js'; import { check } from '../engine/oracle.js';
import { baselineSuite, generate } from '../engine/suites.js'; import { runSuite } from './experiment.js';
export function robustness(){
const E=(s:string,q:number,f?:string)=>({event:makeEvent('p',s,q),...(f?{fault:f}:{})}), DEF=Object.keys(META), out:Record<string,any>={};
// 1. Seed sweep: false positives on the reference + per-defect detection rate and cases-to-first-detection.
const seeds=Array.from({length:30},(_,i)=>i+1), det:Record<string,{hit:number;first:number[]}>=Object.fromEntries(DEF.map(h=>[h,{hit:0,first:[] as number[]}])); let fp=0;
for(const s of seeds){const c=generate(s,300); fp+=runSuite(c,'correct').failing.length;
  for(const h of DEF){const f=runSuite(c,h).failing; if(f.length){det[h].hit++; det[h].first.push(c.findIndex(x=>x.id===f[0].id)+1);}}}
out.seedSweep={seeds:seeds.length,casesPerSeed:300,referenceFalsePositives:fp,
  perDefect:Object.fromEntries(DEF.map(h=>[h,{detectedInSeeds:`${det[h].hit}/${seeds.length}`,medianCasesToFirstDetection:det[h].first.sort((a,b)=>a-b)[Math.floor(det[h].first.length/2)]??null}]))};
// 2. Small-budget sweep: how few generated cases are needed?
out.budget=Object.fromEntries([10,25,50,100].map(n=>[n,Object.fromEntries(DEF.map(h=>[h,`${seeds.filter(s=>runSuite(generate(s,n),h).failing.length).length}/${seeds.length}`]))]));
// 3. Baseline sensitivity: add the two tests an engineer who anticipated these failure classes would write.
const extra=[{id:'A10',name:'duplicate separated by another event',plan:[E('authorized',1),E('captured',2),E('authorized',1),E('captured',2)]},
             {id:'A11',name:'failure after fulfilment, then retry',plan:[E('authorized',1),E('captured',2,'mid')]}];
out.augmentedBaseline=Object.fromEntries(DEF.map(h=>[h,runSuite([...baselineSuite,...extra],h).failing.length>0]));
// 4. Oracle sanity: hand-built correct traces must yield zero violations; the reference must also pass hostile-but-valid plans.
const ok=[[E('authorized',1),E('captured',2)],[E('captured',2),E('authorized',1),E('refunded',3)],[E('refunded',3),E('captured',2),E('authorized',1)],[E('authorized',1,'mid'),E('captured',2,'mid')]];
out.oracleSanity=ok.every(p=>check(p,run(HANDLERS.correct,p)).length===0);
return out;}
