import { writeFileSync, mkdirSync } from 'node:fs';
import { experiment, runSuite, suites, DEFAULT_CONFIG, type Config } from './experiment/experiment.js';
import { ci } from './experiment/ci.js'; import { HANDLERS, META } from './engine/handlers.js';
import { robustness } from './experiment/robustness.js'; import { httpCheck } from './experiment/http-check.js'; import { buildReport } from './experiment/report.js';
import { baselineSuite, generate } from './engine/suites.js';
const arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.split('=')[1]??d;
const cfg:Config={...DEFAULT_CONFIG,seed:+arg('seed','1337'),cases:+arg('cases','300')};
const out=(p:string,o:unknown)=>{mkdirSync(p.split('/').slice(0,-1).join('/'),{recursive:true});writeFileSync(p,JSON.stringify(o,null,2));};
async function main(){const cmd=process.argv[2];
  if(cmd==='experiment'){const r:any=experiment(cfg);out('results/experiment.json',r);
    console.log(JSON.stringify({config:r.config,totals:r.totals,gate:r.gate,verdict:r.verdict,fingerprint:r.fingerprint},null,1));
    for(const h of Object.keys(META)){const m=r.handlers[h].minimal;console.log(`\n== ${h} baseline:${r.handlers[h].baselineDetected} flowguard:${r.handlers[h].flowguardDetected}`+(m?` | ${m.invariant} ${m.name} | minimal ${m.deliveries} deliveries | repro ${m.reproduced}\n${m.sequence}`:''));}
    process.exitCode=r.verdict.startsWith('PROV')?0:2;}
  else if(cmd==='ci'){const h=arg('handler','correct'),r=ci(h,cfg);out(`results/ci-${h}.json`,r);console.log(JSON.stringify(r,null,1));process.exitCode=r.exit;}
  else if(cmd==='baseline'||cmd==='flowguard'){const S=suites(cfg)[cmd];for(const h of Object.keys(HANDLERS)){const r=runSuite(S,h);console.log(`${h.padEnd(8)} ${r.executions} tests  ${r.failing.length} failing  ${r.ms.toFixed(1)}ms`);}}
  else if(cmd==='robustness'){const r=robustness();out('results/robustness.json',r);console.log(JSON.stringify(r,null,1));}
  else if(cmd==='http-check'){const r=await httpCheck([...baselineSuite,...generate(cfg.seed,cfg.cases)]);console.table(r);process.exitCode=Object.values(r).some((x:any)=>x.mismatchesVsInProcess)||r.correct.failingOverHttp?1:0;}
  else if(cmd==='report'){out('public/report.json',buildReport(cfg));console.log('wrote public/report.json');}
  else{console.error('usage: baseline|flowguard|experiment|ci|robustness|http-check|report');process.exitCode=3;}}
main().catch(e=>{console.error('FlowGuard error:',e instanceof Error?e.message:e);process.exitCode=3;});
