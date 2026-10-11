# FlowGuard — independent prototype, not an official Razorpay product
Synthetic simulator only. No Razorpay credentials, network or real transactions. TypeScript · Vitest · Vite + React. Node >= 20.

    npm install
    npm test                  # engine + HTTP adapter + UI tests (15; none depend on generated files)
    npm run typecheck
    npm run baseline          # Suite A x 6 handlers
    npm run flowguard         # Suite B (seeded, bounded) x 6 handlers
    npm run experiment        # comparison + gate -> results/experiment.json (exit 0 provisional pass / 2 not validated)
    npm run ci -- --handler=D3 --seed=1337   # PASS 0 / FAIL 1 / INCONCLUSIVE 3
    npm run robustness        # seed sweep, budget sweep, baseline sensitivity
    npm run http-check        # drive handlers over real HTTP; must match in-process
    npm run report && npm run dev            # UI from public/report.json
    npm run report && EMBED=1 npx vite build # single-file UI (report embedded)

## Architecture (concern -> location)
1 simulator `src/engine/sim.ts` · 2 handlers `handlers.ts` · 3 invariants `oracle.ts` · 4 baseline + 5 generator `suites.ts` · 6 minimizer `minimize.ts` · 7 experiment/comparison `src/experiment/experiment.ts` · 8 CI decision `ci.ts` · 9 UI `src/ui/` (React). `src/cli.ts` does all I/O; `report.ts` defines the versioned Report that is the only UI/engine interface (`loadReport.ts`). The engine runs without a browser. Oracle, detection and CI decision are deterministic; there is no LLM.

Types: `strict` on except `noImplicitAny` (handlers/trace entries are loosely typed). Known gap.
Limitations and results: see EVALUATION.md. 5 seeded defects, one author: proof of concept only.

## Reproduce the main result (one command)
    npm ci && npm run verify
Runs typecheck, all tests, the experiment (seed 1337), the 30-seed robustness sweep and the HTTP equivalence check; exits non-zero on any failure. Expected: baseline 3/5, FlowGuard 5/5, additional D1 and D3, 0 reference false positives, fingerprint f2b6b4e915568eed (runtimes vary by machine).

## Recommended next steps (not done)
1. Blind baseline written by other engineers. 2. Run on real anonymized handlers via the HTTP adapter. 3. Independent review of gate criteria 4 and 8 and of the shared transition rule. 4. Mutation-generated defects. 5. Turn on `noImplicitAny`. 6. Look at the UI on real devices.
