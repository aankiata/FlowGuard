# FlowGuard — technical evaluation (independent prototype, not an official Razorpay product)
Reproduce: `npm test && npm run experiment && npm run robustness` (seed 1337, 300 cases). All numbers below come from those runs.

## Verdict: PROVISIONAL PASS — proof of concept only
| | Result |
|---|---|
| Reference passes | yes: 0 false positives (also 0 across 30 seeds x 300 cases) |
| Baseline (9 tests) | 3/5 defects (D2, D4, D5) |
| FlowGuard (300 seeded cases) | 5/5; additional: D1 (stale dedupe cache), D3 (non-atomic fulfil + retry) |
| Reproduction | 100/100 re-runs of 5 minimized sequences; smallest = 1 delivery (D3) |
| Cost | ~4 ms vs ~166 ms for the full 6-handler run |
| Seed sweep | every defect found in 30/30 seeds at 300 cases; D3 is the hardest (median 52 cases to first hit; 24/30 seeds at 100 cases) |

## Manual review of gate criteria 4 and 8 (self-review by the author — needs an independent reviewer)
- Criterion 4 (plausible sequence): D1 = a captured event redelivered after another event; D3 = a handler failure after the side effect, before commit. Both occur with real at-least-once webhook delivery. Accepted.
- Criterion 8 (oracle soundness): the oracle checks execution logs plus an independent fold of authentic events sorted by seq. Hand-built correct traces produce no violations. CAVEAT: the fold and the reference handler share the same `reach` transition rule, so a wrong rule would be wrong in both. Not independent on policy.

## The most important finding against the hypothesis
Adding just two hand-written baseline tests (a duplicate separated by another event; a failure after fulfilment followed by retry) makes the baseline catch 5/5. So FlowGuard's advantage here is "finds the failure classes without someone having to think of them", not "finds bugs a good engineer could not". The advantage depends on (a) the baseline author not anticipating those cases and (b) the simulator exposing a mid-handler fault point, which real handlers may not allow without instrumentation.

## What remains unproven
Real handler code; real Razorpay webhook semantics (this is my model, not theirs); false-positive rate on real handlers with legitimately different policies; whether engineers prefer this to writing the two extra tests; adoption and demand. Defects, baseline and generator share one author; n=5 defects.

## Next experiments
1. Blind baseline: have 3+ engineers write the baseline without seeing the defect list; measure what fraction of defects FlowGuard adds.
2. Run on 5-10 anonymized real handlers (Express/Flask) via an HTTP adapter; count real bugs vs oracle-policy disagreements.
3. Make the oracle's transition policy configurable per merchant; measure false positives.
4. Add partial refunds, concurrent delivery, and clock-skewed timestamps.
5. Mutation testing: auto-mutate the reference handler to get defects nobody hand-picked.
Stop criterion: if experiments 1-2 show <1 real additional bug per ~5 handlers or most findings are policy disagreements, stop or reframe as a checklist/lint rather than a fuzzer.

## Addendum: HTTP adapter
Over real HTTP (309 cases x 6 handlers) results match in-process exactly (0 mismatches; reference 0 failures; D1-D5 all detected). This validates the transport/contract only: the targets are still this prototype's own handlers. Experiment 2 (real handlers) remains the decisive open test.

## Addendum: stack migration
Project migrated to TypeScript/Vitest/Vite+React; experiment fingerprint unchanged (f2b6b4e915568eed), 15 tests pass (verified from a clean copy: npm ci, typecheck, tests, experiment x2 with identical fingerprint).
