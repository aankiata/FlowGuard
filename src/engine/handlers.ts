import { verify, reach, direct } from './sim.js';
// Parametrised standard handler: correct reference + two single-flaw variants (D4, D5).
const std = (o:{sig?:string;direct?:boolean}={}) => (env,e) => {
  env.fault('pre');
  if (o.sig==='ifPresent' ? (e.signature!==undefined && !verify(e)) : !verify(e)) { env.reject(e,'bad_signature'); return; }
  if (env.processed.has(e.id)) return;
  env.tx(() => { const p=env.get(e.paymentId), t=e.snapshot.status;
    if (e.seq<=p.seq) { env.processed.add(e.id); return; }                       // stale
    if (!(o.direct ? direct(p.status,t) : reach(p.status,t))) {
      if(!o.direct) env.processed.add(e.id); env.reject(e,'illegal_transition'); return; }
    if (t==='captured' && !env.fulfilled.has(e.orderId)) env.fulfill(e);
    env.fault('mid'); env.commit(e,t); env.processed.add(e.id); });
};
// D1: dedupes only against the LAST event id seen; stale check uses `<` (off by one); fulfils on every captured apply.
const d1 = (env,e) => { env.fault('pre'); if(!verify(e)) return env.reject(e,'bad_signature');
  if (e.id===env.lastEventId) return; env.lastEventId=e.id;
  const p=env.get(e.paymentId), t=e.snapshot.status;
  if (e.seq<p.seq) return; if (p.status!==t && !reach(p.status,t)) return;
  if (t==='captured') env.fulfill(e); env.commit(e,t); };
// D2: trusts the snapshot: no seq/transition check, only a "refunded is terminal" guard.
const d2 = (env,e) => { env.fault('pre'); if(!verify(e)) return env.reject(e,'bad_signature');
  if (env.processed.has(e.id)) return; env.processed.add(e.id);
  const p=env.get(e.paymentId), t=e.snapshot.status; if (p.status==='refunded') return;
  if (t==='captured' && !env.fulfilled.has(e.orderId)) env.fulfill(e); env.commit(e,t); };
// D3: fulfils (external side effect) BEFORE committing state/processed marker; no transaction, no per-order guard.
const d3 = (env,e) => { env.fault('pre'); if(!verify(e)) return env.reject(e,'bad_signature');
  if (env.processed.has(e.id)) return;
  const p=env.get(e.paymentId), t=e.snapshot.status;
  if (e.seq<=p.seq) { env.processed.add(e.id); return; }
  if (!reach(p.status,t)) { env.processed.add(e.id); return env.reject(e,'illegal_transition'); }
  if (t==='captured') env.fulfill(e);
  env.fault('mid'); env.commit(e,t); env.processed.add(e.id); };
export const HANDLERS = { correct:std(), D1:d1, D2:d2, D3:d3, D4:std({sig:'ifPresent'}), D5:std({direct:true}) };
export const META = {
 D1:{intended:'INV1',defect:'Duplicate suppression remembers only the last event id; stale check uses < instead of <=.',why:'A "last seen id" cache feels sufficient when duplicates arrive back-to-back; off-by-one on a seq comparison is easy.',trigger:'captured(seq2), any other event, captured(seq2) again',expected:'Order fulfilled once',observed:'Order fulfilled twice'},
 D2:{intended:'INV2',defect:'Overwrites payment state from the event snapshot with no seq/transition check (only refunded is guarded).',why:'Developers treat the snapshot as authoritative "latest state".',trigger:'captured(seq2) then delayed authorized(seq1)',expected:'State stays captured',observed:'State regresses to authorized'},
 D3:{intended:'INV5',defect:'Fulfils before committing state/processed marker, non-atomically; retry re-runs fulfilment.',why:'Fulfil-then-persist ordering is natural; a crash/timeout in between is rare in happy-path tests.',trigger:'captured(seq2) whose handler fails after fulfilment, then retry',expected:'Order fulfilled once',observed:'Order fulfilled twice'},
 D4:{intended:'INV4',defect:'Signature verified only when a signature header is present.',why:'Guarding an optional header "if present" is a common refactor slip.',trigger:'captured event with no signature',expected:'Rejected, no state change',observed:'Accepted and fulfilled'},
 D5:{intended:'INV6',defect:'Only accepts DIRECT transitions and drops (does not retain) events that skip a step.',why:'Strict state-machine checks look safer than allowing skipped-step events.',trigger:'captured(seq2) delivered before authorized(seq1)',expected:'Final state captured',observed:'Captured discarded; final state authorized'} };
