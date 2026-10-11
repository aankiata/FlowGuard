// @vitest-environment jsdom
import { test, expect, afterEach, beforeAll } from 'vitest'; import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'; afterEach(cleanup); import { buildReport } from '../src/experiment/report'; import { DEFAULT_CONFIG } from '../src/experiment/experiment';
// Report is built in-process from the engine: tests never depend on a pre-generated file.
let cached: any; const getReport = () => (cached ??= buildReport(DEFAULT_CONFIG)); beforeAll(() => { getReport(); }, 120000);
import { App } from '../src/ui/App';
test('UI renders real report.json on every screen', async () => {
  (window as any).__FLOWGUARD_REPORT__ = getReport();
  render(<App />);
  await waitFor(() => screen.getByText('Experiment overview'));
  for (const [tab, text] of [['Comparison', 'Baseline vs FlowGuard'], ['Investigation', 'Failure investigation'], ['CI decision', 'CI release decision'], ['Robustness', 'Seed sweep'], ['Docs', 'HTTP adapter']] as const) {
    fireEvent.click(screen.getByRole('button', { name: tab })); expect(screen.getAllByText(new RegExp(text)).length).toBeGreaterThan(0);
  }
});
test('UI shows a clear error when the report is missing', async () => {
  delete (window as any).__FLOWGUARD_REPORT__; (globalThis as any).fetch = async () => ({ ok: false, status: 404 });
  render(<App />); await waitFor(() => screen.getByText('Could not load report'));
});
test('count-up lands on the real value; chart tooltip works from the keyboard', async () => {
  (window as any).__FLOWGUARD_REPORT__ = getReport();
  const { container } = render(<App />);
  await screen.findByText('Experiment overview');
  await screen.findByText('3 / 5', {}, { timeout: 3000 });
  fireEvent.click(screen.getByRole('button', { name: 'Robustness' }));
  const chart = container.querySelector('.chartwrap')!; fireEvent.focus(chart); fireEvent.keyDown(chart, { key: 'ArrowRight' });
  expect(screen.getByRole('tooltip').textContent).toMatch(/generated cases/); fireEvent.keyDown(chart, { key: 'Escape' }); expect(screen.queryByRole('tooltip')).toBeNull();
});
test('table and matrix tooltips appear on focus and carry real numbers', async () => {
  (window as any).__FLOWGUARD_REPORT__ = getReport();
  render(<App />); await screen.findByText('Experiment overview');
  fireEvent.click(screen.getByRole('button', { name: 'Comparison' }));
  fireEvent.focus(screen.getByText('False positives (reference)')); expect(screen.getByRole('tooltip').textContent).toMatch(/Must be 0/);
  fireEvent.blur(screen.getByText('False positives (reference)'));
  const cell = document.querySelector('.mx .tipx.plain')!; fireEvent.focus(cell); expect(screen.getByRole('tooltip').textContent).toMatch(/of 9 hand-written tests|generated cases/);
});
