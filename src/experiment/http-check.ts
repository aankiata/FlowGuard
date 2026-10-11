import { startServer, httpRun } from './adapter.js'; import { HANDLERS } from '../engine/handlers.js'; import { run } from '../engine/sim.js'; import { check, primary } from '../engine/oracle.js'; import { baselineSuite, generate } from '../engine/suites.js';
export async function httpCheck(cases){const out:Record<string,any>={};
  for(const hid of Object.keys(HANDLERS)){const s:any=await startServer(hid);let mism=0,failing=0,base=0;
    for(const c of cases){const h=check(c.plan,await httpRun(s.url,c.plan)),l=check(c.plan,run(HANDLERS[hid],c.plan));
      if(primary(h)!==primary(l))mism++;if(h.length){failing++;if(baselineSuite.includes(c))base++;}}
    await s.close();out[hid]={cases:cases.length,failingOverHttp:failing,baselineFailing:base,mismatchesVsInProcess:mism};}
  return out;}
