import { useEffect, useState, type ReactNode, type PointerEvent, type KeyboardEvent } from 'react';
export const INV: Record<string, string> = { INV1: 'Delivering the same event again must not repeat a non-repeatable action.', INV2: 'A stale event must not overwrite newer valid state.', INV3: 'An order must be fulfilled at most once.', INV4: 'An event with an invalid or missing signature must not change state or trigger actions.', INV5: 'Retrying after a temporary failure must not repeat irreversible actions.', INV6: 'Legitimate later events must not be lost; illegal transitions are rejected.' };
export function InvBanner({ inv, name, msgs }: { inv: string; name: string; msgs: string[] }) {
  return <div className="inv"><div className="id">{inv}</div><div><b>{name}</b><div className="exp">Expected: {INV[inv]}</div><ul>{msgs.map((x, i) => <li key={i}>{x}</li>)}</ul></div></div>;
}
function Line({ t }: { t: string }) {
  const p = t.split(/(\s+)/);
  return <span className="ln">{p.map((w, i) => <span key={i} className={/^evt_/.test(w) ? 't-id' : /^payment\./.test(w) ? 't-ty' : /^seq=/.test(w) ? 't-seq' : /^\[fail@/.test(w) ? 't-f' : /^\[(no|bad)-sig\]/.test(w) ? 't-s' : ''}>{w}</span>)}</span>;
}
export const Repro = ({ text, title = 'minimal-reproduction.txt' }: { text: string; title?: string }) =>
  <div className="term"><div className="bar"><i /><i /><i /><span style={{ marginLeft: 8 }}>{title}</span></div><pre>{text.split('\n').map((l, i) => <Line key={i} t={l} />)}</pre></div>;

export function Timeline({ m, step, setStep }: { m: any; step: number; setStep: (n: number) => void }) {
  const [play, setPlay] = useState(false), N = m.plan.length;
  useEffect(() => { if (!play) return; const t = setTimeout(() => { if (step >= N - 1) setPlay(false); else setStep(step + 1); }, 800); return () => clearTimeout(t); }, [play, step]);
  const bad = new Set<number>(), per: Record<string, number> = {};
  for (const l of m.trace) {
    if (l.k === 'fulfill') { const o = l.orderId || 'o'; per[o] = (per[o] ?? 0) + 1; if (per[o] > 1) bad.add(l.delivery); }
    if (l.k === 'apply' && l.seq < l.prevSeq) bad.add(l.delivery);
    if ((l.k === 'apply' || l.k === 'fulfill') && !l.sigOk) bad.add(l.delivery);
    if (m.invariant === 'INV6' && l.k === 'reject') bad.add(l.delivery);
  }
  const st: Record<string, string> = {}; let ful = 0; const states: { s: string; f: number }[] = [];
  for (let i = 0; i < N; i++) { for (const l of m.trace) if (l.delivery === i) { if (l.k === 'apply') st[l.eventId.split('_')[1]] = l.to; if (l.k === 'fulfill') ful++; } states.push({ s: Object.values(st).join(', ') || 'created', f: ful }); }
  return <><div className="row"><button className="s" onClick={() => { if (!play && step >= N - 1) setStep(-1); setPlay(!play); }}>{play ? 'Pause' : 'Play replay'}</button><button className="s" onClick={() => setStep(Math.min(step + 1, N - 1))}>Step replay ▸</button><button className="s" onClick={() => { setPlay(false); setStep(-1); }}>Reset</button><span className="mut">Replays the recorded execution trace.</span></div>
    <div className="rail">{m.plan.map((d: any, i: number) => { const e = d.event, ls = m.trace.filter((l: any) => l.delivery === i);
      const k = bad.has(i) ? 'n-bad' : ls.some((l: any) => l.k === 'fulfill') ? 'n-ful' : ls.some((l: any) => l.k === 'apply') ? 'n-apply' : ls.some((l: any) => l.k === 'reject') ? 'n-rej' : '';
      return <div key={i} style={{ ['--i' as any]: i }} className={`col ${bad.has(i) ? 'culprit' : ''} ${step >= 0 && i > step ? 'dim' : ''} ${i === step ? 'cur' : ''}`}><span className={`node ${k}`} />
        <div className="ty">#{i} {e.type.replace('payment.', '')}</div><div className="mut mono">seq {e.seq} · t={e.createdAt}</div>
        <div style={{ marginTop: 6 }}>{e.signature === undefined ? <span className="tag a">no signature</span> : e.signature.startsWith('000000') ? <span className="tag a">invalid signature</span> : <span className="tag">sig ok</span>}{d.fault && <span className="tag r">fail@{d.fault}</span>}</div>
        <div className="out">{ls.length ? ls.map((l: any, j: number) => l.k === 'apply' ? <div key={j}>applied {l.from}→{l.to}</div> : l.k === 'fulfill' ? <div key={j} className={bad.has(i) ? 'x' : 'f'}>FULFILLED · attempt {l.attempt}</div> : l.k === 'reject' ? <div key={j} className="w">rejected: {l.why}</div> : <div key={j} className="x">handler failed · attempt {l.attempt}</div>) : <div>no effect (ignored)</div>}</div>
        <div className="mut">state: <b style={{ color: 'var(--ink)' }}>{states[i].s}</b> · fulfilments <b style={{ color: states[i].f > 1 ? 'var(--bad)' : 'var(--ink)' }}>{states[i].f}</b></div></div>; })}</div>
    <div className="legend">{[['var(--blue)', 'state applied'], ['var(--ok)', 'fulfilled'], ['var(--warn)', 'rejected'], ['var(--bad)', 'invariant violation'], ['var(--mut)', 'ignored']].map(([c, t]) => <span key={t}><i style={{ background: c }} />{t}</span>)}</div></>;
}
export function Verdict({ r }: { r: any }) {
  const k = r.decision === 'PASS' ? 'ok' : r.decision === 'FAIL' ? 'bad' : 'warn';
  return <div className={`verdict v-${k}`}><div className="v-word">{r.decision}</div><div><span className="pill">exit {r.exit}</span><span className={`pill ${r.blocksBuild ? 'p-bad' : 'p-ok'}`}>{r.blocksBuild ? 'build blocked' : 'build not blocked'}</span>{r.invariant && <span className="pill p-bad">{r.invariant}</span>}
    <p>{r.decision === 'FAIL' ? `Invariant ${r.invariant} violated by sequence ${r.failing}. Minimal reproduction below.` : r.decision === 'PASS' ? 'No violations in the executed sequences. This is not proof the integration is bug-free.' : 'Execution did not complete; evidence is insufficient.'}</p></div></div>;
}
export function DetectionMatrix({ R }: { R: any }) {
  const D = Object.keys(R.meta), H = R.exp.handlers, mx = Math.max(...D.map(h => H[h].flowguardFails));
  const c = (h: string, b: boolean) => { const n = b ? H[h].baselineFails : H[h].flowguardFails, y = b ? H[h].baselineDetected : H[h].flowguardDetected; const tip = b ? `Baseline: ${n} of 9 hand-written tests fail for ${h}. A defect counts as detected if at least one test fails.` : `FlowGuard: ${n} of ${R.exp.config.cases} generated cases fail for ${h} (seed ${R.exp.config.seed}). Many failing cases can still be one underlying defect.`; return <Tip plain text={tip}><div className={`${y ? 'yes' : 'no'} ${!b && !H[h].baselineDetected && y ? 'new' : ''}`}>{y ? 'detected' : 'missed'}<small>{n} failing {b ? 'of 9' : `of ${R.exp.config.cases}`}</small><div className="bar2" style={{ width: `${Math.max(4, (n / mx) * 100)}%` }} /></div></Tip>; };
  return <div className="mx"><div className="h" /><div className="h">Baseline</div><div className="h">FlowGuard</div>{D.flatMap(h => [<div key={h} className="lb"><Tip text={R.meta[h].defect}>{h}</Tip></div>, <div key={h + 'b'}>{c(h, true)}</div>, <div key={h + 'f'}>{c(h, false)}</div>])}</div>;
}
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Count-up for numeric tokens (not those glued to letters, e.g. "D1"). Final text always equals the real value.
export function Num({ v }: { v: string | number }) {
  const t = String(v), [p, setP] = useState(reduced() ? 1 : 0);
  useEffect(() => { if (p >= 1) return; const raf = window.requestAnimationFrame || ((f: FrameRequestCallback) => window.setTimeout(() => f(performance.now()), 16)); const t0 = performance.now(); let on = true;
    const tick = (n: number) => { if (!on) return; const q = Math.min(1, (n - t0) / 900); setP(q); if (q < 1) raf(tick); }; raf(tick); return () => { on = false; }; }, []);
  const e = 1 - Math.pow(1 - p, 3);
  return <>{p >= 1 ? t : t.replace(/(?<![A-Za-z])\d+(?:\.\d+)?/g, x => (parseFloat(x) * e).toFixed((x.split('.')[1] || '').length))}</>;
}
export function BudgetChart({ R }: { R: any }) {
  const B = R.rob.budget, S = R.rob.seedSweep, D = Object.keys(R.meta), xs = Object.keys(B), W = 560, Ht = 200, n = xs.length;
  const labels = [...xs, String(S.casesPerSeed)], raw = (h: string, i: number): string => i < n ? B[xs[i]][h] : S.perDefect[h].detectedInSeeds;
  const f = (s: string) => { const [a, b] = s.split('/').map(Number); return a / b; };
  const col = ['#2b84ea', '#0b8a5f', '#d08a00', '#8a5cf5', '#d6333a'], px = (i: number) => 40 + (i * (W - 60)) / n, py = (v: number) => 20 + (1 - v) * (Ht - 50);
  const [hi, setHi] = useState<number | null>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); if (!r.width) return; setHi(Math.max(0, Math.min(n, Math.round((((e.clientX - r.left) / r.width) * W - 40) / (W - 60) * n)))); };
  const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setHi(h => Math.min(n, (h ?? -1) + 1)); else if (e.key === 'ArrowLeft') setHi(h => Math.max(0, (h ?? 1) - 1)); else if (e.key === 'Escape') setHi(null); };
  return <><div className="chartwrap" tabIndex={0} aria-label="Detection rate versus search budget. Use arrow keys to inspect." onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHi(null)} onKeyDown={key} onBlur={() => setHi(null)}>
    <svg className="chart" viewBox={`0 0 ${W} ${Ht}`} width="100%" role="img" aria-label="Detection rate versus search budget">{[0, .5, 1].map(v => <g key={v}><line className="gl" x1="40" x2={W - 20} y1={py(v)} y2={py(v)} /><text x="4" y={py(v) + 4}>{v * 100}%</text></g>)}
      {labels.map((l, i) => <text key={i} x={px(i) - 8} y={Ht - 8}>{l}</text>)}
      {hi !== null && <line className="guide" x1={px(hi)} x2={px(hi)} y1="14" y2={Ht - 28} />}
      {D.map((h, j) => <path key={h} pathLength={1} stroke={col[j]} d={labels.map((_, i) => `${i ? 'L' : 'M'}${px(i)},${py(f(raw(h, i))) + j * 1.2}`).join('')} />)}
      {hi !== null && D.map((h, j) => <circle key={h} cx={px(hi)} cy={py(f(raw(h, hi))) + j * 1.2} r="4.5" fill={col[j]} stroke="var(--card)" strokeWidth="2" />)}</svg>
    {hi !== null && <div role="tooltip" className={`tip ${hi > n / 2 ? 'tipL' : 'tipR'}`} style={{ left: `${(px(hi) / W) * 100}%` }}><b>{labels[hi]} generated cases</b>{D.map((h, j) => <div key={h}><i style={{ background: col[j] }} />{h}<span>{raw(h, hi)} seeds</span></div>)}</div>}</div>
    <div className="legend">{D.map((h, j) => <span key={h}><i style={{ background: col[j] }} />{h}</span>)}<span>x: generated cases · y: share of 30 seeds detecting the defect · hover, tap or use ←/→</span></div></>;
}

// Accessible tooltip: hover, keyboard focus, or tap. Fixed-positioned so scroll containers never clip it.
export function Tip({ text, children, plain }: { text: string; children: ReactNode; plain?: boolean }) {
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const show = (el: HTMLElement) => { const r = el.getBoundingClientRect(), w = window.innerWidth; setPos({ x: Math.min(Math.max(r.left + r.width / 2, 130), Math.max(130, w - 130)), y: r.top > 110 ? r.top - 8 : r.bottom + 8, below: r.top <= 110 }); };
  return <span className={`tipx ${plain ? 'plain' : ''}`} tabIndex={0} onPointerEnter={e => show(e.currentTarget)} onPointerLeave={() => setPos(null)} onFocus={e => show(e.currentTarget)} onBlur={() => setPos(null)} onKeyDown={e => e.key === 'Escape' && setPos(null)}>
    {children}{pos && <span role="tooltip" className="ftip" style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.below ? '0' : '-100%'})` }}>{text}</span>}</span>;
}
