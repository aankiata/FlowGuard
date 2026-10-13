// Inlines the built JS and CSS into dist/index.html so the dashboard is one self-contained file.
import { readFileSync, writeFileSync } from 'node:fs';
let html = readFileSync('dist/index.html', 'utf8');
const read = (p) => readFileSync('dist/' + p.replace(/^\//, ''), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g, (_, p) => `<style>${read(p)}</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (_, p) => `<script type="module">${read(p).replace(/<\/script/gi, '<\\/script')}</script>`);
if (/(src|href)="\/?assets\//.test(html)) throw new Error('inline failed: asset references remain');
writeFileSync('dist/index.html', html);
console.log('wrote dist/index.html (' + Math.round(html.length / 1024) + ' kB, self-contained)');  