import {mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync}from'node:fs';
const root=new URL('./',import.meta.url),source=new URL('../apps/web-demo/public/',root);
// Rebuild only the existing Office QA output. No CAD application bundle.
rmSync(new URL('public/',root),{recursive:true,force:true});mkdirSync(new URL('public/',root));
copyFileSync(new URL('styles.css',source),new URL('public/styles.css',root));
let smm=readFileSync(new URL('smm.js',source),'utf8').replace('MAKSTER Office 6.0 · SMM & Creative','MAKSTER AI Office 6.1 · SMM & Creative').replace('open(initial);','/* Marketing router restores the active section. */').replace('render(tab){view=tab;if(!data)refresh();else render()}', 'render(tab){view=tab;return refresh()}');
writeFileSync(new URL('public/smm.js',root),smm);
for(const f of['marketing.js','marketing.css'])copyFileSync(new URL(f,root),new URL('public/'+f,root));
writeFileSync(new URL('public/index.html',root),`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MAKSTER AI OFFICE 6.1 · Маркетинг</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/marketing.css"></head><body class="marketing-office"><header class="marketing-header"><div class="brand"><span class="mark">M</span><div><strong>MAKSTER AI OFFICE</strong><small>Маркетинг и продвижение MAKSTER ATELIER · 6.1 Owner QA</small></div></div><span class="pill">Публикации OFF</span></header><div class="marketing-layout"><nav id="marketingNav" aria-label="Разделы маркетингового офиса"></nav><main id="htmlStage" aria-live="polite"><p>Загрузка маркетингового офиса…</p></main></div><div class="bottom-tabs hidden"></div><script src="/marketing.js"></script><script src="/smm.js"></script></body></html>`);
console.log('Existing MAKSTER Office: marketing-only UI + recovered marketing core + SMM 6.0.1.');
