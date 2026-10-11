import { defineConfig, type Plugin } from 'vite'; import react from '@vitejs/plugin-react'; import { viteSingleFile } from 'vite-plugin-singlefile'; import { readFileSync } from 'node:fs';
// EMBED=1 inlines public/report.json (real engine output) into the single-file build as window.__FLOWGUARD_REPORT__.
const embed=():Plugin=>({name:'embed-report',transformIndexHtml:()=>process.env.EMBED?[{tag:'script',children:`window.__FLOWGUARD_REPORT__=${readFileSync('public/report.json','utf8').replace(/</g,'\\u003c')}`,injectTo:'head-prepend'}]:[]});
export default defineConfig({plugins:[react(),embed(),...(process.env.EMBED?[viteSingleFile()]:[])]});
