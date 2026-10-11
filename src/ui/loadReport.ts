import type { Report } from '../experiment/report';
declare global { interface Window { __FLOWGUARD_REPORT__?: Report } }
// The only coupling between UI and engine: a versioned Report JSON (embedded, or served as /report.json).
export async function loadReport(): Promise<Report> {
  const r = window.__FLOWGUARD_REPORT__ ?? await fetch('/report.json').then(x => { if (!x.ok) throw new Error(`report.json not found (HTTP ${x.status}). Run: npm run report`); return x.json(); });
  if (r.schemaVersion !== 1) throw new Error(`Unsupported report schemaVersion ${r.schemaVersion}`);
  return r;
}
