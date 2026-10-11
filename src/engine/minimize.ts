import { run } from './sim.js'; import { check, primary } from './oracle.js';
// Greedy delta-debugging: repeatedly drop deliveries, then drop injected faults, while the SAME primary invariant still fails.
// Result is 1-minimal w.r.t. these two operations only -- not globally minimal.
export function minimize(handler,plan,inv=primary(check(plan,run(handler,plan)))){
  const fails=p=>p.length>0 && check(p,run(handler,p)).some(x=>x.inv===inv);
  if(!fails(plan)) return plan; let cur=plan,ch=true;
  while(ch){ch=false;
    for(let i=0;i<cur.length;i++){const t=cur.filter((_,j)=>j!==i); if(fails(t)){cur=t;ch=true;i--;}}
    for(let i=0;i<cur.length;i++) if(cur[i].fault){const t=cur.map((d,j)=>j===i?{event:d.event}:d); if(fails(t)){cur=t;ch=true;}}}
  return cur;
}
export const fmt=plan=>plan.map((d,i)=>`#${i} ${d.event.id} ${d.event.type} seq=${d.event.seq}${d.fault?` [fail@${d.fault}]`:''}${d.event.signature===undefined?' [no-sig]':d.event.signature.startsWith('000000')?' [bad-sig]':''}`).join('\n');
