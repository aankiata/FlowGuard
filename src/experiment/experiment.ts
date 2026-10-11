import { performance } from 'node:perf_hooks'; import { createHash } from 'node:crypto';
import { HANDLERS, META } from '../engine/handlers.js'; import { run } from '../engine/sim.js'; import { check, primary, NAMES } from '../engine/oracle.js';
import { type Case, baselineSuite, generate } from '../engine/suites.js'; import { minimize, fmt } from '../engine/minimize.js';
export interface Config{seed:number;cases:number;maxDeliveries:number}
export const DEFAULT_CONFIG:Config={seed:1337,cases:300,maxDeliveries:9};
export function runSuite(cases:Case[],hid:string){const t=performance.now(),failing:any[]=[];
  for(const c of cases){const v=check(c.plan,run(HANDLERS[hid],c.plan)); if(v.length)failing.push({...c,violations:v,primary:primary(v)});}
  return {executions:cases.length,failing,ms:performance.now()-t};}
export function suites(CONFIG:Config){return {baseline:baselineSuite,flowguard:generate(CONFIG.seed,CONFIG.cases,CONFIG.maxDeliveries)};}
export function experiment(CONFIG:Config=DEFAULT_CONFIG){
  const S=suites(CONFIG),rep:any={config:CONFIG,handlers:{},totals:{}};let ms={baseline:0,flowguard:0},fp={baseline:0,flowguard:0},min=0,reproOk=0,reproTot=0;
  for(const hid of Object.keys(HANDLERS)){
    const a=runSuite(S.baseline,hid),b=runSuite(S.flowguard,hid); ms.baseline+=a.ms;ms.flowguard+=b.ms;
    const h:any={baselineFails:a.failing.length,flowguardFails:b.failing.length,baselineDetected:a.failing.length>0,flowguardDetected:b.failing.length>0};
    if(hid==='correct'){fp.baseline+=a.failing.length;fp.flowguard+=b.failing.length;}
    else if(b.failing.length){
      const worst=[...b.failing].sort((x,y)=>x.plan.length-y.plan.length)[0];
      const m=minimize(HANDLERS[hid],worst.plan,worst.primary); min++;
      let ok=0;for(let i=0;i<20;i++){const p=JSON.parse(JSON.stringify(m)),v=check(p,run(HANDLERS[hid],p));if(v.some(x=>x.inv===worst.primary))ok++;}
      reproOk+=ok;reproTot+=20;
      h.invariantsSeen=[...new Set(b.failing.flatMap(f=>f.violations.map(v=>v.inv)))];
      h.intendedInvariantObserved=h.invariantsSeen.includes(META[hid].intended);
      h.distinctMinimizedShapes=new Set(b.failing.slice(0,25).map(f=>fmt(minimize(HANDLERS[hid],f.plan,f.primary)).replace(/evt_\w+?_/g,'').replace(/pay\w+/g,'')).values()).size;
      h.minimal={invariant:worst.primary,name:NAMES[worst.primary],deliveries:m.length,sequence:fmt(m),plan:m,
        violations:check(m,run(HANDLERS[hid],m)).filter(v=>v.inv===worst.primary),trace:run(HANDLERS[hid],m).log,meta:META[hid],reproduced:`${ok}/20`};}
    rep.handlers[hid]=h;}
  const D=Object.keys(META),base=D.filter(h=>rep.handlers[h].baselineDetected),fg=D.filter(h=>rep.handlers[h].flowguardDetected),extra=fg.filter(h=>!base.includes(h));
  rep.totals={seededDefects:D.length,baselineDetected:base,flowguardDetected:fg,additionalByFlowGuard:extra,
    executions:{baseline:S.baseline.length*6,flowguard:S.flowguard.length*6},runtimeMs:{baseline:+ms.baseline.toFixed(2),flowguard:+ms.flowguard.toFixed(2)},
    falsePositives:fp,reproduction:`${reproOk}/${reproTot}`,minimizedReproductions:min};
  const g=rep.totals,gate=[
   ['1 correct reference passes both suites',fp.baseline===0&&fp.flowguard===0],
   ['2 baseline credible (catches >=1 defect)',base.length>=1],
   ['3 FlowGuard detects >=1 additional defect',extra.length>=1],
   ['5 additional finding violates documented (intended) invariant',extra.length>0&&extra.every(h=>rep.handlers[h].intendedInvariantObserved)],
   ['6 minimized repro fails consistently',reproTot>0&&reproOk===reproTot],
   ['4/8 plausible sequence & sound oracle','MANUAL REVIEW (see README)']];
  rep.gate=gate.map(([c,p])=>({criterion:c,result:p===true?'PASS':p===false?'FAIL':p}));
  rep.verdict=gate.every(([,p])=>p!==false)&&extra.length>=1?'PROVISIONAL PASS (proof of concept only)':'HYPOTHESIS NOT VALIDATED';
  rep.fingerprint=createHash('sha256').update(JSON.stringify({h:rep.handlers,t:{...g,runtimeMs:0}})).digest('hex').slice(0,16);
  return rep;}
