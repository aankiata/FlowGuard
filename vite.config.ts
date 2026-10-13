import { defineConfig, type Plugin } from 'vite'; import react from '@vitejs/plugin-react'; import { readFileSync } from 'node:fs';
// `vite build --mode embed` inlines public/report.json (real engine output) as window.__FLOWGUARD_REPORT__;
// scripts/inline.mjs then folds JS and CSS into the HTML for a single self-contained file.
const embed = (): Plugin => ({ name: 'embed-report', transformIndexHtml: () => [{ tag: 'script', children: `window.__FLOWGUARD_REPORT__=${readFileSync('public/report.json', 'utf8').replace(/</g, '\\u003c')}`, injectTo: 'head-prepend' }] });
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'embed' ? [embed()] : [])],
  build: mode === 'embed' ? { cssCodeSplit: false, assetsInlineLimit: 100000000, rollupOptions: { output: { inlineDynamicImports: true } } } : {},
}));