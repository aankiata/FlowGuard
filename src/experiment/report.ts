// Single defined interface between the engine and any UI: a versioned, JSON-serialisable Report.
import { experiment, type Config } from './experiment.js'; import { ci } from './ci.js'; import { robustness } from './robustness.js'; import { HANDLERS, META } from '../engine/handlers.js';
export function buildReport(cfg:Config){
  const exp:any=experiment(cfg);
  return {schemaVersion:1,exp,ci:Object.fromEntries(Object.keys(HANDLERS).map(h=>[h,ci(h,cfg)])) as Record<string,any>,meta:META as Record<string,any>,rob:robustness() as any};
}
export type Report=ReturnType<typeof buildReport>;
