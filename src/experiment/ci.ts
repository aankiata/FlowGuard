import { HANDLERS } from '../engine/handlers.js'; import { minimize, fmt } from '../engine/minimize.js';
import { runSuite, suites, DEFAULT_CONFIG, type Config } from './experiment.js';
export function ci(hid:string,CONFIG:Config=DEFAULT_CONFIG){const S=suites(CONFIG),all=[...S.baseline,...S.flowguard];let res;
  try{const f=runSuite(all,hid).failing; res=f.length?{decision:'FAIL',exit:1,blocksBuild:true,failing:f[0].id,invariant:f[0].primary,
    reproduction:fmt(minimize(HANDLERS[hid],f[0].plan,f[0].primary)),rerun:`npm run ci -- --handler=${hid} --seed=${CONFIG.seed}`}
    :{decision:'PASS',exit:0,blocksBuild:false,note:`No invariant violations in ${all.length} executed sequences (not proof of correctness).`};}
  catch(e){res={decision:'INCONCLUSIVE',exit:3,blocksBuild:true,error:String(e)};}
  return res;}
